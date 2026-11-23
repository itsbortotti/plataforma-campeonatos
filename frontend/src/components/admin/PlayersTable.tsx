"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Pencil,
  Trash2,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Search,
  X,
  User,
  UserPlus,
  Copy,
  Eye,
  EyeOff,
  Download,
  FileText,
  FileSpreadsheet,
  MessageCircle,
  MoreHorizontal,
} from "lucide-react";
import { PlayerDialog } from "./PlayerDialog";
import { AddExistingPlayerDialog } from "./AddExistingPlayerDialog";
import { CopyRosterDialog } from "./CopyRosterDialog";
import { ConfirmDialog } from "./ConfirmDialog";
import {
  removePlayerFromSeason,
  setPlayerActive,
} from "@/app/admin/jogadores/actions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  buildPlayersCsv,
  buildPlayersHtml,
  buildPlayersText,
  downloadBlob,
  openPrintWindow,
} from "@/lib/players-export";
import type {
  AuthUser,
  AvailablePlayer,
  PlayerWithRoster,
  Season,
  Team,
} from "@/lib/queries";

const positionLabel: Record<string, string> = {
  GOL: "Goleiro",
  ZAG: "Zagueiro",
  LAT: "Lateral",
  VOL: "Volante",
  MEI: "Meia",
  ATA: "Atacante",
};

const positionColor: Record<string, string> = {
  GOL: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  ZAG: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  LAT: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  VOL: "bg-violet-500/20 text-violet-400 border-violet-500/30",
  MEI: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  ATA: "bg-red-500/20 text-red-400 border-red-500/30",
};

const positionOrder = ["GOL", "ZAG", "LAT", "VOL", "MEI", "ATA"];

type SortKey = "nickname" | "name" | "position" | "team" | "number";
type SortDir = "asc" | "desc";

interface Props {
  players: PlayerWithRoster[];
  availablePlayers: AvailablePlayer[];
  teams: Team[];
  authUsers: AuthUser[];
  seasonId: string;
  seasonName: string;
  otherSeasons: Season[];
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active)
    return <ArrowUpDown className="h-3 w-3 text-muted-foreground/40" />;
  return dir === "asc" ? (
    <ArrowUp className="h-3 w-3" />
  ) : (
    <ArrowDown className="h-3 w-3" />
  );
}

export function PlayersTable({
  players,
  availablePlayers,
  teams,
  authUsers,
  seasonId,
  seasonName,
  otherSeasons,
}: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [addExistingOpen, setAddExistingOpen] = useState(false);
  const [addExistingKey, setAddExistingKey] = useState(0);
  const [copyRosterOpen, setCopyRosterOpen] = useState(false);
  const [copyRosterKey, setCopyRosterKey] = useState(0);
  const [editingPlayer, setEditingPlayer] = useState<PlayerWithRoster | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = useState<PlayerWithRoster | null>(
    null,
  );
  const [deleting, startDelete] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("nickname");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [search, setSearch] = useState("");
  const [filterPosition, setFilterPosition] = useState<string | null>("all");
  const [filterTeam, setFilterTeam] = useState<string | null>("all");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "active" | "inactive"
  >("active");
  const [togglingId, setTogglingId] = useState<string | null>(null);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const teamFilters = useMemo(() => {
    const set = new Set<string>();
    let hasAvulso = false;
    for (const p of players) {
      if (p.roster!.teamShortName) set.add(p.roster!.teamShortName);
      else hasAvulso = true;
    }
    const sorted = [...set].sort();
    return hasAvulso ? [...sorted, "__avulso__"] : sorted;
  }, [players]);

  const usedNumbersByTeam = useMemo(() => {
    const map: Record<string, number[]> = {};
    for (const p of players) {
      const tid = p.roster!.teamId;
      const n = p.roster!.number;
      if (!tid || n == null) continue;
      if (!map[tid]) map[tid] = [];
      map[tid].push(n);
    }
    return map;
  }, [players]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const pos = filterPosition ?? "all";
    const team = filterTeam ?? "all";
    return players.filter((p) => {
      if (
        q &&
        !p.nickname.toLowerCase().includes(q) &&
        !p.name.toLowerCase().includes(q)
      )
        return false;
      if (pos !== "all" && p.position !== pos) return false;
      if (filterStatus === "active" && !p.isActive) return false;
      if (filterStatus === "inactive" && p.isActive) return false;
      if (team === "__avulso__") {
        if (p.roster!.teamShortName) return false;
      } else if (team !== "all" && p.roster!.teamShortName !== team) {
        return false;
      }
      return true;
    });
  }, [players, search, filterPosition, filterTeam, filterStatus]);

  const sorted = useMemo(() => {
    const mult = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      switch (sortKey) {
        case "nickname":
          return mult * a.nickname.localeCompare(b.nickname);
        case "name":
          return mult * a.name.localeCompare(b.name);
        case "position":
          return (
            mult *
            (positionOrder.indexOf(a.position) -
              positionOrder.indexOf(b.position))
          );
        case "team": {
          const ta = a.roster!.teamShortName ?? "zzz";
          const tb = b.roster!.teamShortName ?? "zzz";
          return mult * ta.localeCompare(tb);
        }
        case "number": {
          const na = a.roster!.number ?? 999;
          const nb = b.roster!.number ?? 999;
          return mult * (na - nb);
        }
        default:
          return 0;
      }
    });
  }, [filtered, sortKey, sortDir]);

  const PAGE_SIZE = 25;
  const [listPage, setListPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(listPage, pageCount);
  const paged = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return sorted.slice(start, start + PAGE_SIZE);
  }, [sorted, safePage]);

  useEffect(() => {
    setListPage(1);
  }, [search, filterPosition, filterTeam, filterStatus, sortKey, sortDir]);

  function openNew() {
    setEditingPlayer(null);
    setDialogOpen(true);
  }

  function openEdit(player: PlayerWithRoster) {
    setEditingPlayer(player);
    setDialogOpen(true);
  }

  function handleDeleteConfirm(reason: string) {
    if (!deleteTarget) return;
    startDelete(async () => {
      const result = await removePlayerFromSeason(
        deleteTarget.id,
        seasonId,
        reason,
      );
      if (result.success) {
        toast.success("Jogador removido do elenco");
        setDeleteTarget(null);
        setDeleteError(null);
      } else {
        toast.error(result.error ?? "Erro ao remover jogador");
        setDeleteError(result.error);
      }
    });
  }

  const hasFilters =
    search !== "" ||
    (filterPosition ?? "all") !== "all" ||
    (filterTeam ?? "all") !== "all" ||
    filterStatus !== "active";

  function clearFilters() {
    setSearch("");
    setFilterPosition("all");
    setFilterTeam("all");
    setFilterStatus("active");
  }

  function exportFilename(ext: string) {
    const slug = seasonName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    return `elenco-${slug || "temporada"}.${ext}`;
  }

  function handleExportCsv() {
    const csv = buildPlayersCsv(players);
    downloadBlob(exportFilename("csv"), csv, "text/csv;charset=utf-8");
    toast.success("CSV gerado");
  }

  function handleExportPdf() {
    const html = buildPlayersHtml(players, seasonName);
    const opened = openPrintWindow(html);
    if (!opened) {
      toast.error("Permita pop-ups para gerar o PDF.");
    } else {
      toast.info("Desmarque “Cabeçalhos e rodapés” em Mais configurações", {
        description: 'Depois escolha "Salvar como PDF".',
        duration: 8000,
      });
    }
  }

  async function handleExportText() {
    const text = buildPlayersText(players, seasonName);
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Texto copiado - cole no WhatsApp");
    } catch {
      // Fallback: download as .txt
      downloadBlob(exportFilename("txt"), text, "text/plain;charset=utf-8");
      toast.info("Texto salvo como arquivo (.txt)");
    }
  }

  async function handleToggleActive(player: PlayerWithRoster) {
    setTogglingId(player.id);
    const result = await setPlayerActive(player.id, !player.isActive);
    setTogglingId(null);
    if (result.success) {
      toast.success(player.isActive ? "Jogador desativado" : "Jogador ativado");
    } else {
      toast.error(result.error ?? "Erro ao atualizar status");
    }
  }

  const columns: { key: SortKey; label: string; className?: string }[] = [
    { key: "nickname", label: "Apelido" },
    { key: "name", label: "Nome" },
    { key: "position", label: "Posição" },
    { key: "team", label: "Time" },
    { key: "number", label: "Nº", className: "text-center" },
  ];

  const isEmpty = players.length === 0;

  if (isEmpty) {
    return (
      <>
        <div className="rounded-xl border border-dashed border-border/50 bg-card/40 p-10 sm:p-14 flex flex-col items-center text-center">
          <div className="h-14 w-14 rounded-2xl bg-accent/40 flex items-center justify-center mb-4">
            <User className="h-6 w-6 text-muted-foreground/50" />
          </div>
          <h2 className="text-lg font-bold mb-1">
            Nenhum jogador em {seasonName}
          </h2>
          <p className="text-sm text-muted-foreground max-w-md mb-6">
            Esta temporada ainda não tem elenco. Comece copiando o elenco de uma
            temporada anterior, adicionando jogadores já cadastrados ou criando
            um novo.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {otherSeasons.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setCopyRosterKey((k) => k + 1);
                  setCopyRosterOpen(true);
                }}
              >
                <Copy className="h-3.5 w-3.5 mr-1" /> Copiar elenco
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setAddExistingKey((k) => k + 1);
                setAddExistingOpen(true);
              }}
              disabled={availablePlayers.length === 0}
            >
              <UserPlus className="h-3.5 w-3.5 mr-1" /> Adicionar existente
            </Button>
            <Button size="sm" onClick={openNew}>
              <Plus className="h-4 w-4 mr-1" /> Novo Jogador
            </Button>
          </div>
        </div>

        <PlayerDialog
          player={editingPlayer}
          teams={teams}
          authUsers={authUsers}
          seasonId={seasonId}
          usedNumbersByTeam={usedNumbersByTeam}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
        />

        <AddExistingPlayerDialog
          key={`add-${addExistingKey}`}
          players={availablePlayers}
          teams={teams}
          seasonId={seasonId}
          usedNumbersByTeam={usedNumbersByTeam}
          open={addExistingOpen}
          onOpenChange={setAddExistingOpen}
        />

        <CopyRosterDialog
          key={`copy-${copyRosterKey}`}
          toSeasonId={seasonId}
          toSeasonName={seasonName}
          sourceSeasons={otherSeasons}
          open={copyRosterOpen}
          onOpenChange={setCopyRosterOpen}
        />
      </>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar jogador..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>
        <Select
          value={filterPosition ?? "all"}
          onValueChange={(v) => setFilterPosition(v)}
          items={[
            { value: "all", label: "Todas posições" },
            ...positionOrder.map((pos) => ({
              value: pos,
              label: positionLabel[pos],
            })),
          ]}
        >
          <SelectTrigger className="w-[150px] h-9 text-sm">
            <SelectValue placeholder="Todas posições" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas posições</SelectItem>
            {positionOrder.map((pos) => (
              <SelectItem key={pos} value={pos}>
                {positionLabel[pos]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filterTeam ?? "all"}
          onValueChange={(v) => setFilterTeam(v)}
          items={[
            { value: "all", label: "Todos times" },
            ...teamFilters.map((t) => ({
              value: t,
              label: t === "__avulso__" ? "Avulsos" : t,
            })),
          ]}
        >
          <SelectTrigger className="w-[130px] h-9 text-sm">
            <SelectValue placeholder="Todos times" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos times</SelectItem>
            {teamFilters.map((t) => (
              <SelectItem key={t} value={t}>
                {t === "__avulso__" ? "Avulsos" : t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filterStatus}
          onValueChange={(v) =>
            setFilterStatus((v as typeof filterStatus) ?? "active")
          }
          items={[
            { value: "active", label: "Ativos" },
            { value: "inactive", label: "Inativos" },
            { value: "all", label: "Todos status" },
          ]}
        >
          <SelectTrigger className="w-[130px] h-9 text-sm">
            <SelectValue placeholder="Ativos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="inactive">Inativos</SelectItem>
            <SelectItem value="all">Todos status</SelectItem>
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-9 text-xs text-muted-foreground"
          >
            <X className="h-3 w-3 mr-1" /> Limpar
          </Button>
        )}
        <div className="ml-auto flex items-center gap-2 flex-wrap">
          <p className="text-sm text-muted-foreground">
            {sorted.length}
            {sorted.length !== players.length
              ? ` / ${players.length}`
              : ""}{" "}
            jogadores
          </p>
          <Button size="sm" onClick={openNew}>
            <Plus className="h-4 w-4 mr-1" /> Novo Jogador
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={(triggerProps) => (
                <Button
                  {...triggerProps}
                  variant="outline"
                  size="icon"
                  className="h-9 w-9"
                  aria-label="Mais ações"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              )}
            />
            <DropdownMenuContent align="end" className="min-w-[200px]">
              <DropdownMenuItem
                onClick={() => {
                  setAddExistingKey((k) => k + 1);
                  setAddExistingOpen(true);
                }}
                disabled={availablePlayers.length === 0}
                className="whitespace-nowrap"
              >
                <UserPlus className="h-3.5 w-3.5 mr-2" />
                Adicionar existente
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setCopyRosterKey((k) => k + 1);
                  setCopyRosterOpen(true);
                }}
                disabled={otherSeasons.length === 0}
                className="whitespace-nowrap"
              >
                <Copy className="h-3.5 w-3.5 mr-2" />
                Copiar elenco
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="whitespace-nowrap">
                  <Download className="h-3.5 w-3.5 mr-2" />
                  Exportar
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="min-w-[200px]">
                  <DropdownMenuItem
                    onClick={handleExportCsv}
                    className="whitespace-nowrap"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5 mr-2" />
                    CSV (Excel)
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleExportPdf}
                    className="whitespace-nowrap"
                  >
                    <FileText className="h-3.5 w-3.5 mr-2" />
                    PDF (imprimir/salvar)
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleExportText}
                    className="whitespace-nowrap"
                  >
                    <MessageCircle className="h-3.5 w-3.5 mr-2" />
                    Texto (WhatsApp)
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="rounded-lg border border-border/40 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border/40 hover:bg-transparent">
              {columns.map((col) => (
                <TableHead
                  key={col.key}
                  className={`text-xs uppercase tracking-wider cursor-pointer select-none hover:text-foreground transition-colors ${col.className ?? ""}`}
                  onClick={() => toggleSort(col.key)}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    <SortIcon active={sortKey === col.key} dir={sortDir} />
                  </span>
                </TableHead>
              ))}
              <TableHead className="w-28" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.map((player) => (
              <TableRow
                key={player.id}
                className={`border-border/30 hover:bg-accent/30 ${player.isActive ? "" : "opacity-60"}`}
              >
                <TableCell className="font-semibold">
                  <span className="flex items-center gap-2.5">
                    <span className="relative h-7 w-7 rounded-lg overflow-hidden bg-accent/40 border border-border/40 shrink-0 flex items-center justify-center">
                      {player.photoUrl ? (
                        <Image
                          src={player.photoUrl}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="28px"
                          unoptimized
                        />
                      ) : (
                        <User className="h-3.5 w-3.5 text-muted-foreground/40" />
                      )}
                    </span>
                    <span className="flex items-center gap-1.5">
                      {player.nickname}
                      {!player.isActive && (
                        <Badge
                          variant="outline"
                          className="text-[9px] border-muted-foreground/30 text-muted-foreground"
                        >
                          Inativo
                        </Badge>
                      )}
                    </span>
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {player.name}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={`text-[10px] border ${positionColor[player.position] ?? ""}`}
                  >
                    {positionLabel[player.position] ?? player.position}
                  </Badge>
                </TableCell>
                <TableCell>
                  {player.roster!.teamId ? (
                    player.roster!.teamLogoUrl ? (
                      <Image
                        src={player.roster!.teamLogoUrl}
                        alt={player.roster!.teamName ?? ""}
                        width={24}
                        height={24}
                        className="object-contain"
                        title={player.roster!.teamName ?? ""}
                      />
                    ) : (
                      <span className="text-sm">
                        {player.roster!.teamShortName}
                      </span>
                    )
                  ) : (
                    <Badge
                      variant="outline"
                      className="text-[10px] text-muted-foreground border-border/40"
                    >
                      Avulso
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-center tabular-nums text-muted-foreground">
                  {player.roster!.number ?? "-"}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleToggleActive(player)}
                      disabled={togglingId === player.id}
                      title={
                        player.isActive ? "Desativar jogador" : "Ativar jogador"
                      }
                    >
                      {player.isActive ? (
                        <Eye className="h-3.5 w-3.5" />
                      ) : (
                        <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEdit(player)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => {
                        setDeleteError(null);
                        setDeleteTarget(player);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {sorted.length > PAGE_SIZE ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground tabular-nums">
            {(safePage - 1) * PAGE_SIZE + 1}–
            {Math.min(safePage * PAGE_SIZE, sorted.length)} de {sorted.length}
          </p>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              disabled={safePage <= 1}
              onClick={() => setListPage((p) => Math.max(1, p - 1))}
            >
              Anterior
            </Button>
            <span className="px-2 text-xs text-muted-foreground tabular-nums">
              {safePage} / {pageCount}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={safePage >= pageCount}
              onClick={() => setListPage((p) => Math.min(pageCount, p + 1))}
            >
              Próxima
            </Button>
          </div>
        </div>
      ) : null}

      <PlayerDialog
        player={editingPlayer}
        teams={teams}
        authUsers={authUsers}
        seasonId={seasonId}
        usedNumbersByTeam={usedNumbersByTeam}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />

      <AddExistingPlayerDialog
        key={`add-${addExistingKey}`}
        players={availablePlayers}
        teams={teams}
        seasonId={seasonId}
        usedNumbersByTeam={usedNumbersByTeam}
        open={addExistingOpen}
        onOpenChange={setAddExistingOpen}
      />

      <CopyRosterDialog
        key={`copy-${copyRosterKey}`}
        toSeasonId={seasonId}
        toSeasonName={seasonName}
        sourceSeasons={otherSeasons}
        open={copyRosterOpen}
        onOpenChange={setCopyRosterOpen}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(v) => {
          if (!v) {
            setDeleteTarget(null);
            setDeleteError(null);
          }
        }}
        title={`Remover ${deleteTarget?.nickname ?? ""} do elenco de ${seasonName}?`}
        description={`"${deleteTarget?.nickname}" (${deleteTarget?.name}) será removido do elenco desta temporada. Se o jogador não tiver histórico em outras temporadas nem registros em partidas, o cadastro será apagado por completo.`}
        confirmLabel="Remover do elenco"
        onConfirm={handleDeleteConfirm}
        loading={deleting}
        error={deleteError}
      />
    </>
  );
}
