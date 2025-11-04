"use client";

import React from "react";
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from "@heroui/table";
import { Input } from "@heroui/input";
import { Pagination } from "@heroui/pagination";
import { Select, SelectItem } from "@heroui/select";
import { Button } from "@heroui/button";
import { MdArrowDropDown, MdArrowDropUp, MdSearch } from "react-icons/md";
import clsx from "clsx";

export type ColumnDef<T> = {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  render?: (row: T) => React.ReactNode;
  className?: string;
};

export type SortState = { sortBy: string; sortOrder: "asc" | "desc" };

type DataTableProps<T> = {
  columns: ColumnDef<T>[];
  rows: T[];
  total: number;
  page: number;
  perPage: number;
  onPageChange: (page: number) => void;
  onPerPageChange: (per: number) => void;
  search: string;
  onSearchChange: (value: string) => void;
  sort: SortState;
  onSortChange: (next: SortState) => void;
  topRight?: React.ReactNode;
  loading?: boolean;
  grouped?: {
    getGroupLabel: (col: ColumnDef<T>) => string | null; // null => identity (rowSpan=2)
    getSubLabel?: (col: ColumnDef<T>) => string; // default -> col.label
    getGroupClass?: (groupLabel: string) => string | undefined; // optional style hooks
  };
  formatCell?: (value: any, col: ColumnDef<T>, row: T) => React.ReactNode;
};

export function DataTable<T extends { id?: string | number }>({
  columns,
  rows,
  total,
  page,
  perPage,
  onPageChange,
  onPerPageChange,
  search,
  onSearchChange,
  sort,
  onSortChange,
  topRight,
  loading,
  grouped,
  formatCell,
}: DataTableProps<T>) {
  const pageCount = Math.max(1, Math.ceil(total / perPage));

  const renderGroupedTable = () => {
    if (!grouped) return null;
    const getSub = grouped.getSubLabel || ((c: ColumnDef<T>) => c.label);
    const identity: ColumnDef<T>[] = [];
    const order: string[] = [];
    const byGroup = new Map<string, ColumnDef<T>[]>();
    columns.forEach((c) => {
      const g = grouped.getGroupLabel(c);
      if (g === null) {
        identity.push(c);
      } else {
        if (!byGroup.has(g)) {
          byGroup.set(g, []);
          order.push(g);
        }
        byGroup.get(g)!.push(c);
      }
    });

    return (
      <div className="rounded-2xl border border-default-100 bg-content2/40 overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              {identity.map((c) => (
                <th key={String(c.key)} rowSpan={2} className="px-3 py-2 text-left font-semibold border-b border-default-100">
                  {c.label}
                </th>
              ))}
              {order.map((g) => (
                <th
                  key={g}
                  colSpan={byGroup.get(g)!.length}
                  className={clsx(
                    "px-3 py-2 text-center font-semibold border-b border-default-100",
                    grouped?.getGroupClass?.(g)
                  )}
                >
                  {g}
                </th>
              ))}
            </tr>
            <tr>
              {order.flatMap((g) =>
                byGroup.get(g)!.map((c) => (
                  <th key={String(c.key)} className="px-3 py-2 text-left font-normal border-b border-default-100">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1"
                      onClick={() =>
                        c.sortable &&
                        onSortChange({
                          sortBy: String(c.key),
                          sortOrder: sort.sortBy === String(c.key) && sort.sortOrder === "asc" ? "desc" : "asc",
                        })
                      }
                    >
                      <span>{getSub(c)}</span>
                      {c.sortable && sort.sortBy === String(c.key) && (sort.sortOrder === "asc" ? <MdArrowDropUp /> : <MdArrowDropDown />)}
                    </button>
                  </th>
                )),
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={String((row as any).id ?? idx)} className={clsx(idx % 2 === 1 && "bg-content1/30")}> 
                {identity.map((c) => (
                  <td key={String(c.key)} className="px-3 py-2 align-top">
                    {c.render
                      ? c.render(row)
                      : (formatCell
                          ? formatCell((row as any)[c.key as string], c, row)
                          : String((row as any)[c.key as string] ?? ""))}
                  </td>
                ))}
                {order.flatMap((g) =>
                  byGroup.get(g)!.map((c) => (
                    <td key={String(c.key)} className="px-3 py-2 align-top">
                      {c.render
                        ? c.render(row)
                        : (formatCell
                            ? formatCell((row as any)[c.key as string], c, row)
                            : String((row as any)[c.key as string] ?? ""))}
                    </td>
                  )),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Input
          aria-label="Search"
          placeholder="Cari..."
          startContent={<MdSearch />}
          value={search}
          onValueChange={onSearchChange}
          className="max-w-xs"
        />
        <div className="flex items-center gap-3">
          <Select
            aria-label="Per halaman"
            selectedKeys={[String(perPage)]}
            onChange={(e) => onPerPageChange(Number(e.target.value))}
            className="w-28"
          >
            {[5, 10, 20, 50, 100].map((n) => (
              <SelectItem key={String(n)}>{n}/hal</SelectItem>
            ))}
          </Select>
          {topRight}
        </div>
      </div>

      {grouped ? (
        renderGroupedTable()
      ) : (
        <div className="rounded-2xl border border-default-100 bg-content2/40 overflow-auto">
          <Table aria-label="data table" removeWrapper hideHeader={false} isStriped>
            <TableHeader>
              {columns.map((c) => (
                <TableColumn key={String(c.key)} className={c.className}>
                  <button
                    type="button"
                    className="flex items-center gap-1"
                    onClick={() =>
                      c.sortable &&
                      onSortChange({
                        sortBy: String(c.key),
                        sortOrder:
                          sort.sortBy === String(c.key) && sort.sortOrder === "asc"
                            ? "desc"
                            : "asc",
                      })
                    }
                    aria-label={c.label + (c.sortable ? " (sort)" : "")}
                  >
                    <span>{c.label}</span>
                    {c.sortable && sort.sortBy === String(c.key) && (
                      sort.sortOrder === "asc" ? <MdArrowDropUp /> : <MdArrowDropDown />
                    )}
                  </button>
                </TableColumn>
              ))}
            </TableHeader>
            <TableBody emptyContent={loading ? "Memuat..." : "Tidak ada data"}>
              {rows.map((row, idx) => (
                <TableRow key={String((row as any).id ?? idx)}>
                  {columns.map((c) => (
                    <TableCell key={String(c.key)}>
                      {c.render ? c.render(row) : String((row as any)[c.key as string] ?? "")}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="text-sm text-default-500">Total: {total}</div>
        <Pagination
          page={page}
          total={pageCount}
          onChange={onPageChange}
          showControls
          isCompact
        />
      </div>
    </div>
  );
}
