import Image from "next/image";
import Link from "next/link";
import { readProfile } from "./lib/profile-store";
import { listPosts } from "./lib/posts-store";
import PostEngagement from "./components/PostEngagement";
import ThemeToggle from "./components/ThemeToggle";
import CopyButton from "./components/CopyButton";
import AnalyticsTracker from "./components/AnalyticsTracker";
import TrackableLink from "./components/TrackableLink";
import MessengerButton from "./components/MessengerButton";
import { SITE_URL } from "./lib/site";

interface Project {
  name: string;
  desc: string;
  tech: string[];
  status: string;
  image?: string;
  href?: string;
}

interface Service {
  icon: string;
  name: string;
  desc: string;
  price: string;
  image?: string;
  href?: string;
}

interface ProfileData {
  name: string;
  tagline: string;
  avatar: string;
  cover?: string;
  birthYear?: number;
  relationship?: string;
  hometown?: string;
  hobbies?: string[];
  bio: string[];
  skills: string[];
  info: { icon: string; label: string; value: string; green?: boolean }[];
  projects: Project[];
  services: Service[];
  socials: { name: string; href: string }[];
  payment: { bankName: string; accountNumber: string; accountHolder: string; qrImage: string };
  theme?: { accent: string; mode: string };
  translations?: { en?: { tagline?: string; bio?: string[] } };
}

interface Post {
  slug: string;
  title: string;
  cover: string;
  content: string;
  tags: string[];
  status: string;
  createdAt: string;
  excerpt?: string;
  category?: string;
}

type TabType = "feed" | "info" | "projects" | "services" | "tools" | "payment";
type IconName =
  | "bank"
  | "briefcase"
  | "calendar"
  | "check"
  | "code"
  | "copy"
  | "external"
  | "heart"
  | "home"
  | "mail"
  | "moon"
  | "qr"
  | "share"
  | "sun"
  | "user"
  | "wallet";

const ICONS: Record<IconName, string> = {
  bank: "M3 10h18 M5 10V8l7-4 7 4v2 M6 10v8 M10 10v8 M14 10v8 M18 10v8 M4 18h16 M3 21h18",
  briefcase: "M10 6V5a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v1 M4 7h16v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7z M4 12h16",
  calendar: "M7 3v3 M17 3v3 M4 8h16 M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1z",
  check: "M20 6 9 17l-5-5",
  code: "m8 9-4 3 4 3 M16 9l4 3-4 3 M14 4l-4 16",
  copy: "M8 8h10v12H8z M6 16H4V4h10v2",
  external: "M7 17 17 7 M9 7h8v8",
  heart: "M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 1 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z",
  home: "M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z",
  mail: "M4 5h16v14H4z M4 7l8 6 8-6",
  moon: "M21 13a8 8 0 1 1-10-10 7 7 0 0 0 10 10z",
  qr: "M4 4h6v6H4z M14 4h6v6h-6z M4 14h6v6H4z M7 7h0 M17 7h0 M7 17h0 M14 14h2v2h-2z M18 14h2v6h-6v-2h4v-4z M14 20h0 M20 20h0",
  share: "M18 8a3 3 0 1 0-2.8-4H15a3 3 0 0 0 1 2.2L8.8 10a3 3 0 1 0 0 4l7.2 3.8A3 3 0 1 0 17 16l-7.2-3.8",
  sun: "M12 4V2 M12 22v-2 M4.93 4.93 3.52 3.52 M20.48 20.48l-1.41-1.41 M4 12H2 M22 12h-2 M4.93 19.07l-1.41 1.41 M20.48 3.52l-1.41 1.41 M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0z",
  user: "M20 21a8 8 0 0 0-16 0 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  wallet: "M4 7h16v12H4z M16 12h4 M6 7V5h12v2",
};

const SOCIAL_ICONS: Record<string, string> = {
  Facebook: "M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z",
  Zalo: "M7.9 20A9 9 0 1 0 4 16.1L2 22Z",
  GitHub: "M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65S9 15.65 9 16v4",
  Telegram: "M21 4 3 11.5l6.7 2.1L12.2 20l3.4-5.1L21 4z M9.7 13.6 18.8 6",
  Email: "M4 5h16v14H4z M4 7l8 6 8-6",
};

function Icon({ name, className = "" }: { name: IconName; className?: string }) {
  return (
    <svg
      className={className || "h-4 w-4"}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={ICONS[name]} />
    </svg>
  );
}

function SocialIcon({ d }: { d: string }) {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}

function shareLinks(url: string, text: string) {
  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(text);
  const full = encodeURIComponent(`${text} ${url}`);
  return [
    { label: "X", href: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}` },
    { label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}` },
    { label: "Telegram", href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}` },
    { label: "Viber", href: `viber://forward?text=${full}` },
  ];
}

function excerpt(markdown: string) {
  return markdown.replace(/[#*_`>\-\[\]()]/g, "").replace(/\s+/g, " ").trim().slice(0, 180);
}

export const dynamic = "force-dynamic";

interface HomeProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const activeTab = (params.tab as TabType) || "feed";

  const data = (await readProfile()) as ProfileData;
  const posts = (await listPosts(false)) as Post[];

  const birthYear = data.birthYear || 1999;
  const age = new Date().getFullYear() - birthYear;
  const hometown =
    data.hometown ||
    data.info.find((item) => item.label.toLowerCase().includes("địa"))?.value ||
    "Việt Nam";
  const relationship = data.relationship || "Đang cập nhật";
  const hobbies = data.hobbies?.length ? data.hobbies : ["Công nghệ", "AI", "Thiết kế sản phẩm"];

  const paymentQr =
    data.payment.qrImage ||
    `https://img.vietqr.io/image/${encodeURIComponent(data.payment.bankName)}-${
      data.payment.accountNumber
    }-compact2.png?accountName=${encodeURIComponent(data.payment.accountHolder)}`;

  const vietQrLink = `https://img.vietqr.io/image/${encodeURIComponent(
    data.payment.bankName
  )}-${data.payment.accountNumber}-compact2.png?accountName=${encodeURIComponent(
    data.payment.accountHolder
  )}`;

  const canonicalBase = SITE_URL;

  return (
    <main className="network-shell">
      {/* Client Analytics Trigger */}
      <AnalyticsTracker type="pageview" label="" />

      <header className="network-topbar">
        <div className="network-container topbar-inner">
          <Link href="/" className="brand-mark" aria-label={data.name}>
            TN
          </Link>
          <div className="topbar-actions">
            <TrackableLink href="/qr" label="QR topbar" className="topbar-link topbar-link-priority">
              <Icon name="qr" /> Tạo QR
            </TrackableLink>
            <Link href="/blog" className="topbar-link">
              Blog
            </Link>
            <ThemeToggle initialMode={data.theme?.mode} initialAccent={data.theme?.accent} />
          </div>
        </div>
      </header>

      <div className="network-container">
        <section className="network-profile">
          <div className="network-cover">
            {data.cover ? (
              <Image
                src={data.cover}
                alt=""
                fill
                sizes="1120px"
                className="cover-image object-cover"
                unoptimized
              />
            ) : null}
            <div className="cover-glass">
              <span>profile://tung-nguyen</span>
              <span>{hometown}</span>
            </div>
          </div>

          <div className="network-profile-body">
            {/* Pulsing Avatar with Glow Aura */}
            <div className="relative w-[110px] h-[55px] z-10">
              <div className="absolute -inset-1.5 rounded-[26px] bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] opacity-40 blur-md animate-pulse-glow" style={{ marginTop: "-55px" }} />
              <div className="network-avatar relative">
                {data.avatar ? (
                  <Image src={data.avatar} alt={data.name} width={140} height={140} unoptimized className="object-cover" />
                ) : (
                  <span>TN</span>
                )}
              </div>
            </div>

            <div className="profile-mainline">
              <div>
                <div className="name-with-age flex items-center gap-3">
                  <h1>{data.name}</h1>
                  <span className="flex items-center gap-1.5 text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full font-bold">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                    </span>
                    Online
                  </span>
                </div>
                <p>@tungnguyen · {data.tagline}</p>
              </div>
              <MessengerButton className="profile-action primary" label="Messenger /vnecs">
                <Icon name="mail" />
                Nhắn tin
              </MessengerButton>
            </div>

            <p className="network-bio">{data.bio[0]}</p>

            <div className="profile-pills">
              <span>
                <Icon name="home" /> {hometown}
              </span>
              <span>
                <Icon name="calendar" /> Sinh năm {birthYear}
              </span>
              <span>
                <Icon name="heart" /> {relationship}
              </span>
              <span>
                <Icon name="check" /> {age} tuổi
              </span>
            </div>

            <div className="network-socials">
              {data.socials.map((social) => (
                <TrackableLink
                  key={social.name}
                  href={social.href}
                  label={social.name}
                  isExternal
                >
                  <SocialIcon d={SOCIAL_ICONS[social.name] || ICONS.external} />
                </TrackableLink>
              ))}
            </div>
          </div>

          <nav className="network-tabs" aria-label="Danh mục hồ sơ">
            {[
              ["feed", "Bảng tin", "/"],
              ["info", "Thông tin", "/?tab=info"],
              ["projects", "Dự án", "/?tab=projects"],
              ["services", "Dịch vụ", "/?tab=services"],
              ["tools", "Công cụ", "/?tab=tools"],
              ["payment", "Thanh toán", "/?tab=payment"],
            ].map(([id, label, href]) => (
              <Link
                key={id}
                href={href}
                className={activeTab === id ? "active" : ""}
                scroll={false}
              >
                {label}
              </Link>
            ))}
          </nav>
        </section>

        <section className="network-content">
          {activeTab === "feed" && (
            <div className="content-grid feed-grid">
              {posts.length === 0 ? (
                <article className="network-card empty-card">Chưa có bài viết blog nào.</article>
              ) : (
                posts.map((post) => {
                  const postUrl = `${canonicalBase}/blog/${post.slug}`;
                  return (
                    <article className="network-card post-feed-card" key={post.slug}>
                      <div className="feed-author">
                        <span className="small-avatar">TN</span>
                        <div>
                          <strong>{data.name}</strong>
                          <p>{new Date(post.createdAt).toLocaleDateString("vi-VN")}</p>
                        </div>
                      </div>
                      {post.cover ? (
                        <div className="safe-image-frame feed-cover-frame relative h-48 w-full overflow-hidden rounded-lg">
                          <Image
                            src={post.cover}
                            alt=""
                            fill
                            className="safe-image object-cover"
                            sizes="(max-width: 768px) 100vw, 800px"
                            unoptimized
                          />
                        </div>
                      ) : null}
                      <h2>{post.title}</h2>
                      <p>{post.excerpt || excerpt(post.content)}</p>
                      <div className="tag-strip">
                        {post.tags.map((tag) => (
                          <span key={tag}>{tag}</span>
                        ))}
                      </div>
                      <div className="share-row read-row">
                        <Link href={`/blog/${post.slug}`}>Đọc bài</Link>
                      </div>
                      <PostEngagement slug={post.slug} title={post.title} url={postUrl} compact />
                    </article>
                  );
                })
              )}
            </div>
          )}

          {activeTab === "info" && (
            <div className="content-grid info-grid">
              <article className="network-card">
                <h2>Thông tin cá nhân</h2>
                <div className="info-list">
                  <div>
                    <Icon name="user" />
                    <span>Họ tên</span>
                    <strong>{data.name}</strong>
                  </div>
                  <div>
                    <Icon name="calendar" />
                    <span>Tuổi</span>
                    <strong>{age} tuổi</strong>
                  </div>
                  <div>
                    <Icon name="home" />
                    <span>Quê quán</span>
                    <strong>{hometown}</strong>
                  </div>
                  <div>
                    <Icon name="heart" />
                    <span>Tình trạng</span>
                    <strong>{relationship}</strong>
                  </div>
                </div>
              </article>
              <article className="network-card">
                <h2>Sở thích</h2>
                <div className="tag-strip">
                  {hobbies.map((item) => (
                    <span key={item}>{item}</span>
                  ))}
                </div>
              </article>
              <article className="network-card">
                <h2>Kỹ năng</h2>
                <div className="tag-strip">
                  {data.skills.map((skill) => (
                    <span key={skill}>{skill}</span>
                  ))}
                </div>
              </article>
            </div>
          )}

          {activeTab === "projects" && (
            <div className="content-grid project-grid">
              {data.projects.map((project) => {
                const projectUrl = project.href || `${canonicalBase}/?tab=projects`;
                return (
                  <article className="network-card project-card" key={project.name}>
                    {project.image ? (
                      <Image
                        src={project.image}
                        alt=""
                        width={720}
                        height={360}
                        className="project-image object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="project-placeholder">
                        <Icon name="briefcase" />
                      </div>
                    )}
                    <div className="card-heading">
                      <div>
                        <h2>{project.name}</h2>
                        <p>{project.status}</p>
                      </div>
                      {project.href ? (
                        <a
                          href={project.href}
                          target="_blank"
                          rel="noreferrer"
                          aria-label="Mở dự án"
                        >
                          <Icon name="external" />
                        </a>
                      ) : null}
                    </div>
                    <p>{project.desc}</p>
                    <div className="tag-strip">
                      {project.tech.map((tech) => (
                        <span key={tech}>{tech}</span>
                      ))}
                    </div>
                    <div className="share-row">
                      {shareLinks(projectUrl, project.name).map((item) => (
                        <a key={item.label} href={item.href} target="_blank" rel="noreferrer">
                          {item.label}
                        </a>
                      ))}
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {activeTab === "services" && (
            <div className="content-grid service-grid-social">
              {data.services.map((service) => {
                const serviceUrl = service.href || `${canonicalBase}/?tab=services`;
                return (
                  <article className="network-card service-social-card" key={service.name}>
                    {service.image ? (
                      <Image
                        src={service.image}
                        alt=""
                        width={720}
                        height={280}
                        className="project-image object-cover"
                        unoptimized
                      />
                    ) : null}
                    <div className="service-title">
                      <span>{service.icon}</span>
                      <div>
                        <h2>{service.name}</h2>
                        <strong>{service.price}</strong>
                      </div>
                    </div>
                    <p>{service.desc}</p>
                    <div className="share-row">
                      <MessengerButton label={`Liên hệ ${service.name}`}>Liên hệ</MessengerButton>
                      {service.href ? (
                        <a href={service.href} target="_blank" rel="noreferrer">
                          Chi tiết
                        </a>
                      ) : null}
                      {shareLinks(serviceUrl, service.name)
                        .slice(0, 3)
                        .map((item) => (
                          <a key={item.label} href={item.href} target="_blank" rel="noreferrer">
                            {item.label}
                          </a>
                        ))}
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {activeTab === "tools" && (
            <div className="content-grid tools-grid">
              <article className="network-card qr-tool-card">
                <div className="qr-tool-copy">
                  <span className="tool-kicker">
                    <Icon name="qr" /> Public QR Studio
                  </span>
                  <h2>QR cho mọi người</h2>
                  <p>URL, Wi-Fi, vCard, VietQR, SMS, email và scanner ảnh/camera.</p>
                  <div className="tag-strip">
                    {["URL", "Wi-Fi", "vCard", "VietQR", "SMS", "Email"].map((item) => (
                      <span key={item}>{item}</span>
                    ))}
                  </div>
                  <div className="share-row">
                    <TrackableLink href="/qr" label="Open public QR generator">
                      <Icon name="qr" /> Tạo QR
                    </TrackableLink>
                    <TrackableLink href="/qr?mode=scan" label="Open public QR scanner">
                      Quét QR
                    </TrackableLink>
                  </div>
                </div>
                <div className="qr-mini animate-fade-in" aria-hidden="true">
                  {Array.from({ length: 49 }, (_, index) => (
                    <span key={index} />
                  ))}
                </div>
              </article>

              <article className="network-card tool-note-card">
                <h2>Không cần đăng nhập</h2>
                <p>
                  Lịch sử lưu trong trình duyệt của người dùng; phần camera chỉ chạy khi họ cấp quyền.
                </p>
                <div className="share-row">
                  <TrackableLink href="/qr?type=vietqr" label="Open public VietQR">
                    VietQR
                  </TrackableLink>
                  <TrackableLink href="/qr?type=wifi" label="Open public Wi-Fi QR">
                    Wi-Fi QR
                  </TrackableLink>
                </div>
              </article>
            </div>
          )}

          {activeTab === "payment" && (
            <div className="content-grid payment-grid">
              <article className="network-card payment-card">
                <h2>Thông tin thanh toán</h2>
                <div className="payment-qr flex justify-center py-2">
                  <Image src={paymentQr} alt="VietQR" width={260} height={260} unoptimized />
                </div>
                <div className="info-list">
                  <div>
                    <Icon name="bank" />
                    <span>Ngân hàng</span>
                    <strong>{data.payment.bankName}</strong>
                  </div>
                  <div>
                    <Icon name="wallet" />
                    <span>Số tài khoản</span>
                    <strong>{data.payment.accountNumber}</strong>
                  </div>
                  <div>
                    <Icon name="user" />
                    <span>Chủ tài khoản</span>
                    <strong>{data.payment.accountHolder}</strong>
                  </div>
                </div>
                <div className="share-row">
                  <CopyButton
                    textToCopy={data.payment.accountNumber}
                    className="flex items-center gap-1 bg-white/[0.04] px-4 py-2 rounded-lg border border-white/[0.08] hover:bg-white/[0.08]"
                    label="Sao chép STK"
                    copiedLabel="Đã sao chép"
                  />
                  <a href={vietQrLink} target="_blank" rel="noreferrer">
                    Mở VietQR
                  </a>
                </div>
              </article>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
