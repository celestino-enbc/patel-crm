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
import type { Category, Client, HubMember } from "@/lib/types";
import type { BoardFiltersState } from "@/lib/board-filters";

export type { BoardFiltersState };

interface BoardFiltersProps {
  categories: Category[];
  customers: Client[];
  hubMembers: HubMember[];
  showClientFilter: boolean;
  currentUserId: string;
  value: BoardFiltersState;
  onChange: (value: BoardFiltersState) => void;
}

export function BoardFilters({
  categories,
  customers,
  hubMembers,
  showClientFilter,
  currentUserId,
  value,
  onChange,
}: BoardFiltersProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.4fr)_repeat(4,minmax(0,0.7fr))] xl:items-center">
      <div className="relative sm:col-span-2 xl:col-span-1">
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
          <SelectTrigger className="w-full">
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
        <SelectTrigger className="w-full">
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
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Turno" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Cualquier turno</SelectItem>
          <SelectItem value="hub">Turno VisorLab</SelectItem>
          <SelectItem value="client">Turno cliente</SelectItem>
        </SelectContent>
      </Select>
      {showClientFilter && (
        <Select
          value={value.responsableId}
          onValueChange={(responsableId) => onChange({ ...value, responsableId })}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Responsable" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los responsables</SelectItem>
            <SelectItem value="unassigned">Sin asignar</SelectItem>
            {hubMembers.some((member) => member.id === currentUserId) && (
              <SelectItem value={currentUserId}>Asignadas a mí</SelectItem>
            )}
            {hubMembers
              .filter((member) => member.id !== currentUserId)
              .map((member) => (
                <SelectItem key={member.id} value={member.id}>
                  {member.full_name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
