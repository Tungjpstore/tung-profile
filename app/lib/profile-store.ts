import path from "path";
import os from "os";
import { readJsonFromStorage, writeJsonToStorage } from "./storage-helper";

export interface InfoItem {
  icon: string;
  label: string;
  value: string;
  green?: boolean;
}

export interface Project {
  name: string;
  desc: string;
  tech: string[];
  status: string;
  image?: string;
  href?: string;
}

export interface Service {
  icon: string;
  name: string;
  desc: string;
  price: string;
  image?: string;
  href?: string;
}

export interface Social {
  name: string;
  href: string;
}

export interface Payment {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  qrImage: string;
}

export interface ProfileData {
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
  info: InfoItem[];
  projects: Project[];
  services: Service[];
  socials: Social[];
  payment: Payment;
  theme?: { accent: string; mode: string };
  template?: string;
  translations?: { en?: { tagline?: string; bio?: string[] } };
}

const keys = {
  r2Key: "data/profile.json",
  blobPath: "data/profile.json",
  kvKey: "tung-profile:profile",
  filePath: path.join(process.cwd(), "data", "profile.json"),
  runtimePath: path.join(os.tmpdir(), "tung-profile-data", "profile.json"),
};

const defaultProfile: ProfileData = {
  name: "Tùng Nguyễn",
  tagline: "Developer • Freelancer • Digital Services",
  avatar: "",
  bio: [],
  skills: [],
  info: [],
  projects: [],
  services: [],
  socials: [],
  payment: { bankName: "", accountNumber: "", accountHolder: "", qrImage: "" },
};

export async function readProfile(): Promise<ProfileData> {
  return readJsonFromStorage<ProfileData>(keys, defaultProfile);
}

export async function writeProfile(data: ProfileData) {
  return writeJsonToStorage(keys, data);
}
