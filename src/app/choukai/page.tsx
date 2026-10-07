import type { Metadata } from "next";
import { ChoukaiStudio } from "@/components/ChoukaiStudio";
import "./choukai.css";

export const metadata: Metadata = {
  title: "Chōkai · Luyện nghe và gõ lại | KotoBase",
  description: "Nghe tiếng Nhật với script đồng bộ, furigana, bản dịch và luyện gõ từng câu.",
};

export default function ChoukaiPage() {
  return <ChoukaiStudio />;
}
