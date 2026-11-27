/* eslint-disable @next/next/no-img-element */
import type { ReactElement } from "react";
import { formatDate } from "@/lib/format-date";
import {
  fixtureKicker,
  showsScore,
  type OgFixture,
  type OgPlayerCard,
  type OgScorer,
  type OgSide,
  type OgStandingRow,
} from "@/lib/og/data";

const NAVY = "#0B1220";
const PANEL = "#15244F";
const CTA = "#C15622";
const GOLD = "#FBBF24";
const MUTED = "#C9D2E3";
const LINE = "rgba(255,255,255,0.14)";

function formatWhen(date: string): string {
  return formatDate(date, {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

function scoreText(fixture: OgFixture): string {
  if (!showsScore(fixture.status)) return "VS";
  return `${fixture.homeScore ?? 0}  ×  ${fixture.awayScore ?? 0}`;
}

function metaLine(fixture: OgFixture): string {
  const when = formatWhen(fixture.date);
  if (fixture.status === "postponed") {
    return fixture.venue ? `Adiado · ${fixture.venue}` : "Adiado";
  }
  return fixture.venue ? `${when} · ${fixture.venue}` : when;
}

function Crest({
  side,
  size,
}: {
  side: OgSide;
  size: number;
}): ReactElement {
  if (side.logo) {
    return (
      <div
        style={{
          width: size,
          height: size,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <img
          src={side.logo}
          alt=""
          width={size}
          height={size}
          style={{ objectFit: "contain" }}
        />
      </div>
    );
  }
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.18),
        background: side.color,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "white",
        fontSize: Math.round(size * 0.28),
        fontWeight: 700,
      }}
    >
      {side.shortName}
    </div>
  );
}

function Shell({
  width,
  height,
  children,
}: {
  width: number;
  height: number;
  children: ReactElement | ReactElement[];
}): ReactElement {
  return (
    <div
      style={{
        width,
        height,
        display: "flex",
        flexDirection: "column",
        background: NAVY,
        color: "white",
        fontFamily: "Noto Sans",
      }}
    >
      <div style={{ height: 12, width: "100%", background: CTA, display: "flex" }} />
      {children}
    </div>
  );
}

function BrandRow({
  siteName,
  detail,
}: {
  siteName: string;
  detail: string;
}): ReactElement {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <div style={{ display: "flex", fontSize: 36, fontWeight: 700, letterSpacing: 1 }}>
        {siteName}
      </div>
      <div style={{ display: "flex", fontSize: 22, color: MUTED }}>{detail}</div>
    </div>
  );
}

function Chip({ label }: { label: string }): ReactElement {
  return (
    <div style={{ display: "flex" }}>
      <div
        style={{
          display: "flex",
          background: CTA,
          color: "white",
          fontSize: 22,
          fontWeight: 700,
          letterSpacing: 2,
          padding: "8px 18px",
          borderRadius: 999,
        }}
      >
        {label}
      </div>
    </div>
  );
}

function EmptyCopy({ title, text }: { title: string; text: string }): ReactElement {
  return (
    <div
      style={{
        display: "flex",
        flex: 1,
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div style={{ display: "flex", fontSize: 54, fontWeight: 700 }}>{title}</div>
      <div style={{ display: "flex", marginTop: 16, fontSize: 26, color: MUTED }}>
        {text}
      </div>
    </div>
  );
}

function TeamBlock({
  side,
  crest,
  align,
}: {
  side: OgSide;
  crest: number;
  align: "flex-start" | "flex-end" | "center";
}): ReactElement {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: align,
        width: 300,
      }}
    >
      <Crest side={side} size={crest} />
      <div
        style={{
          display: "flex",
          marginTop: 18,
          fontSize: 42,
          fontWeight: 700,
        }}
      >
        {side.shortName}
      </div>
      <div
        style={{
          display: "flex",
          marginTop: 6,
          fontSize: 22,
          color: MUTED,
          textAlign: "center",
        }}
      >
        {side.name}
      </div>
    </div>
  );
}

export function storyFixture({
  siteName,
  fixture,
  kicker,
  width,
  height,
}: {
  siteName: string;
  fixture: OgFixture | null;
  kicker?: string;
  width: number;
  height: number;
}): ReactElement {
  return (
    <Shell width={width} height={height}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          padding: "48px 64px 40px",
        }}
      >
        <BrandRow
          siteName={siteName}
          detail={fixture?.competitionName || "Campeonato amador"}
        />
        {fixture ? (
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <div style={{ display: "flex", marginTop: 36 }}>
              <Chip label={kicker || fixtureKicker(fixture.status)} />
            </div>
            <div
              style={{
                display: "flex",
                flex: 1,
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <TeamBlock side={fixture.home} crest={210} align="center" />
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  width: 280,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    color: GOLD,
                    fontSize: 24,
                    fontWeight: 700,
                    letterSpacing: 2,
                  }}
                >
                  {`RODADA ${fixture.round}`}
                </div>
                <div
                  style={{
                    display: "flex",
                    marginTop: 12,
                    fontSize: showsScore(fixture.status) ? 84 : 72,
                    fontWeight: 700,
                  }}
                >
                  {scoreText(fixture)}
                </div>
                <div
                  style={{
                    display: "flex",
                    marginTop: 16,
                    fontSize: 22,
                    color: MUTED,
                    textAlign: "center",
                  }}
                >
                  {metaLine(fixture)}
                </div>
              </div>
              <TeamBlock side={fixture.away} crest={210} align="center" />
            </div>
          </div>
        ) : (
          <EmptyCopy
            title="Sem jogo no momento"
            text="A agenda aparece aqui quando a rodada for marcada."
          />
        )}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            borderTop: `1px solid ${LINE}`,
            paddingTop: 22,
            fontSize: 22,
            color: MUTED,
          }}
        >
          <div style={{ display: "flex" }}>sflcampeonato.com.br</div>
          <div style={{ display: "flex" }}>{fixture?.seasonName || "SFL"}</div>
        </div>
      </div>
    </Shell>
  );
}

export function storyScorers({
  siteName,
  competitionName,
  seasonName,
  rows,
  width,
  height,
}: {
  siteName: string;
  competitionName: string;
  seasonName: string;
  rows: OgScorer[];
  width: number;
  height: number;
}): ReactElement {
  return (
    <Shell width={width} height={height}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          padding: "48px 64px 40px",
        }}
      >
        <BrandRow siteName={siteName} detail={competitionName} />
        <div style={{ display: "flex", marginTop: 28 }}>
          <Chip label="ARTILHARIA" />
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 8,
            fontSize: 22,
            color: MUTED,
          }}
        >
          {seasonName || "Temporada atual"}
        </div>
        {rows.length === 0 ? (
          <EmptyCopy title="Ainda sem gols" text="Os artilheiros entram depois da primeira rodada." />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", marginTop: 20 }}>
            {rows.map((row) => (
              <div
                key={`${row.rank}-${row.nickname}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  height: 96,
                  borderBottom: `1px solid ${LINE}`,
                }}
              >
                <div
                  style={{
                    width: 64,
                    display: "flex",
                    fontSize: 32,
                    fontWeight: 700,
                    color: row.rank === 1 ? GOLD : MUTED,
                  }}
                >
                  {String(row.rank)}
                </div>
                <div
                  style={{
                    width: 10,
                    height: 46,
                    borderRadius: 6,
                    background: row.color,
                    display: "flex",
                  }}
                />
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    flex: 1,
                    marginLeft: 18,
                  }}
                >
                  <div style={{ display: "flex", fontSize: 32, fontWeight: 700 }}>
                    {row.nickname}
                  </div>
                  <div style={{ display: "flex", fontSize: 20, color: MUTED }}>
                    {row.team}
                  </div>
                </div>
                <div style={{ display: "flex", fontSize: 42, fontWeight: 700 }}>
                  {String(row.goals)}
                </div>
              </div>
            ))}
          </div>
        )}
        <div style={{ display: "flex", flex: 1 }} />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            borderTop: `1px solid ${LINE}`,
            paddingTop: 22,
            fontSize: 22,
            color: MUTED,
          }}
        >
          <div style={{ display: "flex" }}>sflcampeonato.com.br</div>
          <div style={{ display: "flex" }}>Gols na temporada</div>
        </div>
      </div>
    </Shell>
  );
}

export function ogHome({
  siteName,
  tagline,
  description,
  fixture,
  width,
  height,
}: {
  siteName: string;
  tagline: string;
  description: string;
  fixture: OgFixture | null;
  width: number;
  height: number;
}): ReactElement {
  return (
    <Shell width={width} height={height}>
      <div style={{ display: "flex", flex: 1 }}>
        <div
          style={{
            width: 520,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "48px 40px 40px 56px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 84, fontWeight: 700, letterSpacing: 1 }}>
              {siteName}
            </div>
            <div
              style={{
                display: "flex",
                marginTop: 12,
                fontSize: 30,
                fontWeight: 700,
                color: GOLD,
              }}
            >
              {tagline}
            </div>
            <div
              style={{
                display: "flex",
                marginTop: 18,
                fontSize: 24,
                color: MUTED,
                lineHeight: 1.35,
              }}
            >
              {description}
            </div>
          </div>
          <div style={{ display: "flex", fontSize: 22, color: MUTED }}>
            sflcampeonato.com.br
          </div>
        </div>
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "36px 48px 36px 12px",
          }}
        >
          <div
            style={{
              width: "100%",
              background: PANEL,
              borderRadius: 28,
              padding: "28px 24px",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {fixture ? (
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <Chip label={fixtureKicker(fixture.status)} />
                  <div style={{ display: "flex", color: GOLD, fontSize: 20, fontWeight: 700 }}>
                    {`RODADA ${fixture.round}`}
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginTop: 28,
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 160 }}>
                    <Crest side={fixture.home} size={110} />
                    <div style={{ display: "flex", marginTop: 12, fontSize: 28, fontWeight: 700 }}>
                      {fixture.home.shortName}
                    </div>
                  </div>
                  <div style={{ display: "flex", fontSize: showsScore(fixture.status) ? 48 : 40, fontWeight: 700 }}>
                    {scoreText(fixture)}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 160 }}>
                    <Crest side={fixture.away} size={110} />
                    <div style={{ display: "flex", marginTop: 12, fontSize: 28, fontWeight: 700 }}>
                      {fixture.away.shortName}
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    marginTop: 22,
                    fontSize: 20,
                    color: MUTED,
                    justifyContent: "center",
                  }}
                >
                  {metaLine(fixture)}
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", padding: "24px 8px" }}>
                <div style={{ display: "flex", fontSize: 32, fontWeight: 700 }}>
                  Classificação, calendário e elencos
                </div>
                <div style={{ display: "flex", marginTop: 12, fontSize: 22, color: MUTED }}>
                  Acompanhe a liga no site.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Shell>
  );
}

export function ogFixture({
  fixture,
  width,
  height,
}: {
  fixture: OgFixture | null;
  width: number;
  height: number;
}): ReactElement {
  if (!fixture) {
    return (
      <Shell width={width} height={height}>
        <div style={{ display: "flex", flex: 1, padding: 56 }}>
          <EmptyCopy title="Partida" text="Esse jogo não está mais na agenda." />
        </div>
      </Shell>
    );
  }
  return (
    <Shell width={width} height={height}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          padding: "36px 56px 32px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Chip label={fixtureKicker(fixture.status)} />
          <div style={{ display: "flex", color: MUTED, fontSize: 22 }}>
            {`${fixture.competitionName} · Rodada ${fixture.round}`}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            flex: 1,
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 280 }}>
            <Crest side={fixture.home} size={150} />
            <div style={{ display: "flex", marginTop: 14, fontSize: 36, fontWeight: 700 }}>
              {fixture.home.shortName}
            </div>
            <div style={{ display: "flex", marginTop: 4, fontSize: 20, color: MUTED }}>
              {fixture.home.name}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ display: "flex", fontSize: showsScore(fixture.status) ? 72 : 64, fontWeight: 700 }}>
              {scoreText(fixture)}
            </div>
            <div style={{ display: "flex", marginTop: 10, fontSize: 22, color: MUTED }}>
              {metaLine(fixture)}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 280 }}>
            <Crest side={fixture.away} size={150} />
            <div style={{ display: "flex", marginTop: 14, fontSize: 36, fontWeight: 700 }}>
              {fixture.away.shortName}
            </div>
            <div style={{ display: "flex", marginTop: 4, fontSize: 20, color: MUTED }}>
              {fixture.away.name}
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}

export function ogStandings({
  competitionName,
  seasonName,
  rows,
  width,
  height,
}: {
  competitionName: string;
  seasonName: string;
  rows: OgStandingRow[];
  width: number;
  height: number;
}): ReactElement {
  return (
    <Shell width={width} height={height}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          padding: "36px 56px 28px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 22, color: GOLD, fontWeight: 700, letterSpacing: 2 }}>
              CLASSIFICAÇÃO
            </div>
            <div style={{ display: "flex", marginTop: 6, fontSize: 40, fontWeight: 700 }}>
              {competitionName}
            </div>
          </div>
          <div style={{ display: "flex", fontSize: 22, color: MUTED }}>{seasonName}</div>
        </div>
        <div style={{ display: "flex", marginTop: 18, color: MUTED, fontSize: 18 }}>
          <div style={{ width: 56, display: "flex" }}>#</div>
          <div style={{ flex: 1, display: "flex" }}>Time</div>
          <div style={{ width: 70, display: "flex", justifyContent: "flex-end" }}>J</div>
          <div style={{ width: 80, display: "flex", justifyContent: "flex-end" }}>SG</div>
          <div style={{ width: 90, display: "flex", justifyContent: "flex-end" }}>Pts</div>
        </div>
        {rows.length === 0 ? (
          <EmptyCopy title="Tabela vazia" text="Os pontos aparecem depois dos primeiros jogos." />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", marginTop: 8 }}>
            {rows.map((row) => (
              <div
                key={row.rank}
                style={{
                  display: "flex",
                  alignItems: "center",
                  height: 52,
                  borderTop: `1px solid ${LINE}`,
                }}
              >
                <div
                  style={{
                    width: 56,
                    display: "flex",
                    fontSize: 22,
                    fontWeight: 700,
                    color: row.rank === 1 ? GOLD : "white",
                  }}
                >
                  {String(row.rank)}
                </div>
                <div style={{ display: "flex", alignItems: "center", flex: 1 }}>
                  <div
                    style={{
                      width: 8,
                      height: 28,
                      borderRadius: 4,
                      background: row.color,
                      display: "flex",
                      marginRight: 12,
                    }}
                  />
                  <div style={{ display: "flex", fontSize: 24, fontWeight: 700 }}>
                    {row.shortName}
                  </div>
                  <div style={{ display: "flex", marginLeft: 12, fontSize: 20, color: MUTED }}>
                    {row.name}
                  </div>
                </div>
                <div style={{ width: 70, display: "flex", justifyContent: "flex-end", fontSize: 22 }}>
                  {String(row.played)}
                </div>
                <div style={{ width: 80, display: "flex", justifyContent: "flex-end", fontSize: 22 }}>
                  {row.goalDifference > 0 ? `+${row.goalDifference}` : String(row.goalDifference)}
                </div>
                <div
                  style={{
                    width: 90,
                    display: "flex",
                    justifyContent: "flex-end",
                    fontSize: 26,
                    fontWeight: 700,
                    color: row.rank === 1 ? GOLD : "white",
                  }}
                >
                  {String(row.points)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Shell>
  );
}

export function ogPlayer({
  player,
  width,
  height,
}: {
  player: OgPlayerCard | null;
  width: number;
  height: number;
}): ReactElement {
  if (!player) {
    return (
      <Shell width={width} height={height}>
        <div style={{ display: "flex", flex: 1, padding: 56 }}>
          <EmptyCopy title="Jogador" text="Perfil não encontrado." />
        </div>
      </Shell>
    );
  }
  const stat = (label: string, value: string) => (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: 160,
        background: PANEL,
        borderRadius: 18,
        padding: "16px 18px",
      }}
    >
      <div style={{ display: "flex", fontSize: 36, fontWeight: 700 }}>{value}</div>
      <div style={{ display: "flex", marginTop: 4, fontSize: 18, color: MUTED }}>{label}</div>
    </div>
  );
  return (
    <Shell width={width} height={height}>
      <div
        style={{
          display: "flex",
          flex: 1,
          alignItems: "center",
          padding: "40px 56px",
        }}
      >
        <div style={{ display: "flex", marginRight: 40 }}>
          {player.photo ? (
            <img
              src={player.photo}
              alt=""
              width={220}
              height={220}
              style={{ objectFit: "cover", borderRadius: 32 }}
            />
          ) : (
            <div
              style={{
                width: 220,
                height: 220,
                borderRadius: 32,
                background: PANEL,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 72,
                fontWeight: 700,
                color: GOLD,
              }}
            >
              {player.number != null && player.number > 0 ? String(player.number) : player.nickname.slice(0, 1)}
            </div>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <div style={{ display: "flex", color: GOLD, fontSize: 20, fontWeight: 700, letterSpacing: 2 }}>
            {player.position.toUpperCase()}
          </div>
          <div style={{ display: "flex", marginTop: 8, fontSize: 64, fontWeight: 700 }}>
            {player.nickname}
          </div>
          <div style={{ display: "flex", marginTop: 6, fontSize: 24, color: MUTED }}>
            {player.team ? `${player.name} · ${player.team}` : player.name}
          </div>
          <div style={{ display: "flex", marginTop: 28 }}>
            {stat("Gols", String(player.goals))}
            <div style={{ width: 16, display: "flex" }} />
            {stat("Assist.", String(player.assists))}
            <div style={{ width: 16, display: "flex" }} />
            {stat(
              "Camisa",
              player.number && player.number > 0 ? String(player.number) : "—",
            )}
          </div>
        </div>
      </div>
    </Shell>
  );
}
