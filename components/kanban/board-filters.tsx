"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AssigneeKind, Category, Client } from "@/lib/types";

export interface BoardFiltersState {
  query: string;
  categoryId: string;
  clientId: string;
  assignee: string;
}

interface BoardFiltersProps {
  categories: Category[];
  customers: Client[];
  showClientFilter: boolean;
  value: BoardFiltersState;
  onChange: (value: BoardFiltersState) => void;
}

export function BoardFilters({
  categories,
  customers,
  showClientFilter,
  value,
  onChange,
}: BoardFiltersProps) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={value.query}
          onChange={(event) => onChange({ ...value, query: event.target.value })}
          placeholder="Buscar por título o descripción…"
          className="pl-9"
        />
      </div>
      {showClientFilter && (
        <Select
          value={value.clientId}
          onValueChange={(clientId) => onChange({ ...value, clientId })}
        >
          <SelectTrigger className="w-full lg:w-56">
            <SelectValue placeholder="Todos los clientes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los clientes</SelectItem>
            {customers.map((client) => (
              <SelectItem key={client.id} value={client.id}>
                {client.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <Select
        value={value.categoryId}
        onValueChange={(categoryId) => onChange({ ...value, categoryId })}
      >
        <SelectTrigger className="w-full lg:w-64">
          <SelectValue placeholder="Todas las categorías" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas las categorías</SelectItem>
          {categories.map((category) => (
            <SelectItem key={category.id} value={category.id}>
              {category.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={value.assignee}
        onValueChange={(assignee) => onChange({ ...value, assignee })}
      >
        <SelectTrigger className="w-full lg:w-48">
          <SelectValue placeholder="Todos los responsables" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos los responsables</SelectItem>
          <SelectItem value="hub">Visor</SelectItem>
          <SelectItem value="client">Cliente</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

export function matchesBoardFilters(
  title: string,
  description: string,
  categoryId: string,
  clientId: string,
  assigneeKind: AssigneeKind,
  filters: BoardFiltersState
) {
  const query = filters.query.trim().toLowerCase();
  const matchesQuery =
    query.length === 0 ||
    title.toLowerCase().includes(query) ||
    description.toLowerCase().includes(query);
  const matchesCategory = filters.categoryId === "all" || filters.categoryId === categoryId;
  const matchesClient = filters.clientId === "all" || filters.clientId === clientId;
  const matchesAssignee = filters.assignee === "all" || filters.assignee === assigneeKind;
  return matchesQuery && matchesCategory && matchesClient && matchesAssignee;
}
