"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export function DeleteAccountButton() {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  async function deleteAccount() {
    const firstConfirm = window.confirm("Yakin mau hapus akun MoneySpender? Semua data akan hilang.");

    if (!firstConfirm) {
      return;
    }

    const typed = window.prompt('Ketik "HAPUS" untuk lanjut.');

    if (typed !== "HAPUS") {
      toast.info("Penghapusan akun dibatalkan.");
      return;
    }

    setIsDeleting(true);
    const response = await fetch("/api/account/delete", { method: "DELETE" });
    setIsDeleting(false);

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      toast.error(payload?.error ?? "Akun belum bisa dihapus.");
      return;
    }

    toast.success("Akun berhasil dihapus.");
    router.replace("/auth");
    router.refresh();
  }

  return (
    <Button variant="danger" fullWidth isLoading={isDeleting} onClick={() => void deleteAccount()}>
      Hapus akun dan semua data
    </Button>
  );
}
