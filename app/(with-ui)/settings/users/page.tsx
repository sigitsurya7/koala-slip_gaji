"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import toast from "react-hot-toast";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";
import { Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@heroui/modal";
import { DataTable, ColumnDef, SortState } from "@/app/(with-ui)/_components/data-table";

type SessionUser = { username: string; role: "Admin" | "Member" } | null;
type Row = { id: number; username: string; role: "Admin" | "Member"; createdAt: string };

export default function SettingsUsersPage() {
  const [session, setSession] = useState<SessionUser>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const router = useRouter();

  // table state
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortState>({ sortBy: "createdAt", sortOrder: "desc" });
  const [loading, setLoading] = useState(false);

  // modal state
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<{ username: string; password: string; role: "Admin" | "Member" }>({ username: "", password: "", role: "Member" });

  const columns: ColumnDef<Row>[] = useMemo(
    () => [
      { key: "username", label: "Username", sortable: true },
      { key: "role", label: "Role", sortable: true },
      { key: "createdAt", label: "Dibuat", sortable: true, render: (r) => new Date(r.createdAt).toLocaleString() },
      {
        key: "actions",
        label: "Aksi",
        render: (r) => (
          <div className="flex gap-2">
            <Button size="sm" variant="flat" onPress={() => onEdit(r)}>Edit</Button>
            <Button size="sm" color="danger" variant="flat" onPress={() => onDelete(r)}>Hapus</Button>
          </div>
        ),
      },
    ],
    []
  );

  useEffect(() => {
    axios
      .get("/api/me")
      .then((res) => setSession(res.data.user))
      .catch(() => setSession(null))
      .finally(() => setSessionLoading(false));
  }, []);

  useEffect(() => {
    if (!sessionLoading && session && session.role !== "Admin") {
      router.replace("/admin");
    }
  }, [sessionLoading, session, router]);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get("/api/users", { params: { page, perPage, search, sortBy: sort.sortBy, sortOrder: sort.sortOrder } });
      setRows(res.data.items);
      setTotal(res.data.total);
    } finally {
      setLoading(false);
    }
  }, [page, perPage, search, sort]);

  useEffect(() => {
    if (!sessionLoading && session && session.role === "Admin") fetchRows();
  }, [sessionLoading, session, fetchRows]);

  const onAdd = () => {
    setEditId(null);
    setForm({ username: "", password: "", role: "Member" });
    setOpen(true);
  };

  const onEdit = (r: Row) => {
    setEditId(r.id);
    setForm({ username: r.username, password: "", role: r.role });
    setOpen(true);
  };

  const onDelete = async (r: Row) => {
    await toast.promise(axios.delete(`/api/users/${r.id}`), {
      loading: "Menghapus...",
      success: "User dihapus",
      error: "Gagal menghapus",
    });
    fetchRows();
  };

  const onSubmit = async () => {
    if (!form.username?.trim()) return toast.error("Username wajib diisi");
    const payload: any = { username: form.username.trim(), role: form.role };
    if (!editId || form.password) payload.password = form.password; // only send when creating or provided

    if (editId) {
      await toast.promise(axios.put(`/api/users/${editId}`, payload), {
        loading: "Menyimpan...",
        success: "Perubahan disimpan",
        error: (e) => e?.response?.data?.message || "Gagal menyimpan",
      });
    } else {
      if (!payload.password) return toast.error("Password wajib diisi");
      await toast.promise(axios.post(`/api/users`, payload), {
        loading: "Membuat user...",
        success: "User dibuat",
        error: (e) => e?.response?.data?.message || "Gagal membuat",
      });
    }
    setOpen(false);
    fetchRows();
  };

  if (sessionLoading) return <p>Loading...</p>;
  if (!session || session.role !== "Admin") return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">User Management</h2>
        <Button color="primary" onPress={onAdd}>Tambah User</Button>
      </div>

      <DataTable<Row>
        columns={columns}
        rows={rows}
        total={total}
        page={page}
        perPage={perPage}
        onPageChange={setPage}
        onPerPageChange={(n) => { setPage(1); setPerPage(n); }}
        search={search}
        onSearchChange={(v) => { setPage(1); setSearch(v); }}
        sort={sort}
        onSortChange={(s) => { setPage(1); setSort(s); }}
        loading={loading}
      />

      <Modal isOpen={open} onOpenChange={setOpen}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>{editId ? "Edit User" : "Tambah User"}</ModalHeader>
              <ModalBody>
                <Input label="Username" value={form.username} onValueChange={(v) => setForm((f) => ({ ...f, username: v }))} />
                <Input type="password" label={editId ? "Password (opsional)" : "Password"} value={form.password} onValueChange={(v) => setForm((f) => ({ ...f, password: v }))} />
                <Select label="Role" selectedKeys={[form.role]} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as any }))}>
                  <SelectItem key="Admin">Admin</SelectItem>
                  <SelectItem key="Member">Member</SelectItem>
                </Select>
              </ModalBody>
              <ModalFooter>
                <Button variant="flat" onPress={onClose}>Batal</Button>
                <Button color="primary" onPress={onSubmit}>Simpan</Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
