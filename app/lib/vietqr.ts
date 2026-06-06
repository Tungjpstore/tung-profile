// VietQR / EMVCo QR Code standard generator
// Ref: https://napas.com.vn & https://vietqr.net

export interface BankInfo {
  bin: string;
  name: string;
  shortName: string;
}

export const POPULAR_BANKS: BankInfo[] = [
  { bin: "970436", name: "Ngân hàng Ngoại Thương Việt Nam", shortName: "Vietcombank" },
  { bin: "970407", name: "Ngân hàng Kỹ Thương Việt Nam", shortName: "Techcombank" },
  { bin: "970422", name: "Ngân hàng Quân Đội", shortName: "MB Bank" },
  { bin: "970418", name: "Ngân hàng Đầu tư và Phát triển Việt Nam", shortName: "BIDV" },
  { bin: "970415", name: "Ngân hàng Công Thương Việt Nam", shortName: "VietinBank" },
  { bin: "970416", name: "Ngân hàng Á Châu", shortName: "ACB" },
  { bin: "970423", name: "Ngân hàng Tiên Phong", shortName: "TPBank" },
  { bin: "970432", name: "Ngân hàng Thịnh Vượng và Phát triển", shortName: "VPBank" },
  { bin: "970403", name: "Ngân hàng Sài Gòn Thương Tín", shortName: "Sacombank" },
  { bin: "970437", name: "Ngân hàng Phát triển TP.HCM", shortName: "HDBank" },
  { bin: "970441", name: "Ngân hàng Quốc tế", shortName: "VIB" },
  { bin: "970443", name: "Ngân hàng Sài Gòn - Hà Nội", shortName: "SHB" },
  { bin: "970405", name: "Ngân hàng Nông nghiệp & Phát triển Nông thôn Việt Nam", shortName: "Agribank" },
  { bin: "970426", name: "Ngân hàng Hàng Hải Việt Nam", shortName: "MSB" },
  { bin: "970448", name: "Ngân hàng Phương Đông", shortName: "OCB" },
  { bin: "970440", name: "Ngân hàng Đông Nam Á", shortName: "SeABank" },
  { bin: "970424", name: "Ngân hàng Shinhan Việt Nam", shortName: "Shinhan Bank" },
];

// Tag-Length-Value formatting helper
function formatTLV(tag: string, value: string): string {
  const len = value.length.toString().padStart(2, "0");
  return `${tag}${len}${value}`;
}

// CRC16 CCITT-FALSE checksum calculation
export function calculateCRC16(str: string): string {
  let crc = 0xffff;
  const polynomial = 0x1021;

  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    crc ^= code << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ polynomial) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }

  return crc.toString(16).toUpperCase().padStart(4, "0");
}

interface VietQRParams {
  bankBin: string;
  accountNumber: string;
  amount?: number;
  memo?: string;
}

export function generateVietQRText({
  bankBin,
  accountNumber,
  amount,
  memo,
}: VietQRParams): string {
  // 1. Format Indicator
  let payload = formatTLV("00", "01");

  // 2. Point of Initiation Method: 11 (Static) or 12 (Dynamic)
  payload += formatTLV("01", amount ? "12" : "11");

  // 3. Merchant Account Information (Tag 38)
  // Sub-tag 00: Global Unique Identifier for NAPAS/VietQR
  const guid = formatTLV("00", "A000000727");
  // Sub-tag 01: Beneficiary details
  const beneficiaryInfo =
    formatTLV("00", bankBin) + formatTLV("01", accountNumber);
  const merchantAccountInfoVal =
    guid + formatTLV("01", beneficiaryInfo) + formatTLV("02", "QRIBFTTC");

  payload += formatTLV("38", merchantAccountInfoVal);

  // 4. Currency: 704 (VND)
  payload += formatTLV("53", "704");

  // 5. Amount (optional)
  if (amount && amount > 0) {
    payload += formatTLV("54", amount.toString());
  }

  // 6. Country: VN
  payload += formatTLV("58", "VN");

  // 7. Additional Info (Memo)
  if (memo) {
    // Sub-tag 08 of Tag 62 is the payment purpose/memo
    const additionalData = formatTLV("08", memo);
    payload += formatTLV("62", additionalData);
  }

  // 8. CRC16 Template (Tag 63, length 04)
  payload += "6304";

  // Calculate CRC16 and append
  const checksum = calculateCRC16(payload);
  return payload + checksum;
}
