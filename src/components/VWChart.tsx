import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { money } from '../logic/format';
import type { Currency } from '../logic/types';
import type { VWResult } from '../logic/vanWestendorp';

export const VW_COLORS = {
  tooCheap: '#c98a2b',
  notCheap: '#e3b565',
  notExpensive: '#7c9fd6',
  tooExpensive: '#b4432f',
};

interface Props {
  r: VWResult;
  currency: Currency;
  height?: number;
}

function PointLabel({
  viewBox,
  label,
  value,
  dy,
  anchor = 'middle',
}: {
  viewBox?: { x: number; y: number };
  label: string;
  value: string;
  dy: number;
  anchor?: 'start' | 'middle' | 'end';
}) {
  if (!viewBox) return null;
  const { x, y } = viewBox;
  const w = 78;
  const bx = anchor === 'middle' ? x - w / 2 : anchor === 'start' ? x + 8 : x - w - 8;
  const by = y + dy - 13;
  return (
    <g>
      <line x1={x} x2={x} y1={y} y2={dy < 0 ? by + 26 : by} stroke="#064e3b" strokeOpacity={0.35} strokeDasharray="2 2" />
      <rect x={bx} y={by} width={w} height={26} rx={6} fill="#064e3b" />
      <text x={bx + w / 2} y={by + 11} textAnchor="middle" fontSize={9.5} fill="#a7f3d0" fontWeight={600} letterSpacing={0.4}>
        {label}
      </text>
      <text x={bx + w / 2} y={by + 22} textAnchor="middle" fontSize={11} fill="white" fontWeight={600} style={{ fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </text>
    </g>
  );
}

export function VWChart({ r, currency, height = 400 }: Props) {
  const data = r.points.map((p) => ({
    price: p.price,
    tooCheap: p.tooCheap * 100,
    notCheap: p.notCheap * 100,
    notExpensive: p.notExpensive * 100,
    tooExpensive: p.tooExpensive * 100,
  }));
  const yAt = (price: number, key: 'tooCheap' | 'notCheap' | 'notExpensive' | 'tooExpensive') => {
    const i = r.points.findIndex((p) => p.price >= price);
    const p = r.points[Math.max(0, i)];
    return p ? (p[key] as number) * 100 : 0;
  };
  const points = [
    { key: 'PMC', price: r.pmc, y: r.pmc !== null ? yAt(r.pmc, 'tooCheap') : 0, dy: -34 },
    { key: 'OPP', price: r.opp, y: r.opp !== null ? yAt(r.opp, 'tooCheap') : 0, dy: -40 },
    { key: 'IPP', price: r.ipp, y: r.ipp !== null ? yAt(r.ipp, 'notCheap') : 0, dy: -34 },
    { key: 'PME', price: r.pme, y: r.pme !== null ? yAt(r.pme, 'tooExpensive') : 0, dy: 34 },
  ];
  // Nudge OPP/IPP labels apart horizontally when they're close
  const close = r.opp !== null && r.ipp !== null && Math.abs(r.opp - r.ipp) < (r.domain[1] - r.domain[0]) * 0.08;

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 40, right: 24, bottom: 8, left: 0 }}>
          <CartesianGrid stroke="#eeece6" vertical={false} />
          <XAxis
            dataKey="price"
            type="number"
            domain={[Math.floor(r.domain[0]), Math.ceil(r.domain[1])]}
            tickFormatter={(v) => money(v, currency)}
            tick={{ fontSize: 11.5, fill: '#6b6f76' }}
            tickLine={false}
            axisLine={{ stroke: '#d6d3ca' }}
            tickCount={9}
          />
          <YAxis
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
            tickFormatter={(v) => `${v}%`}
            tick={{ fontSize: 11.5, fill: '#6b6f76' }}
            tickLine={false}
            axisLine={false}
            width={44}
          />
          {r.pmc !== null && r.pme !== null && (
            <ReferenceArea
              x1={r.pmc}
              x2={r.pme}
              fill="#10b981"
              fillOpacity={0.08}
              stroke="#10b981"
              strokeOpacity={0.25}
              strokeDasharray="3 3"
              label={{ value: 'Range of acceptable prices', position: 'insideTop', fontSize: 11, fill: '#047857', fontWeight: 600, dy: -26 }}
            />
          )}
          <Tooltip
            cursor={{ stroke: '#cfccc2' }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              return (
                <div className="rounded-lg border border-line bg-surface px-3 py-2 text-[12px] shadow-pop">
                  <div className="mb-1 font-semibold tabular">{money(Number(label), currency, 0)}</div>
                  {payload.map((p) => (
                    <div key={String(p.dataKey)} className="flex items-center justify-between gap-4 tabular">
                      <span className="flex items-center gap-1.5 text-muted">
                        <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
                        {p.name}
                      </span>
                      <span className="font-medium">{Number(p.value).toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              );
            }}
          />
          <Legend
            verticalAlign="bottom"
            iconType="plainline"
            wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
          />
          <Line dataKey="tooCheap" name="Too cheap" stroke={VW_COLORS.tooCheap} strokeWidth={2.25} dot={false} isAnimationActive={false} />
          <Line dataKey="notCheap" name="Not cheap" stroke={VW_COLORS.notCheap} strokeWidth={2} strokeDasharray="5 4" dot={false} isAnimationActive={false} />
          <Line dataKey="notExpensive" name="Not expensive" stroke={VW_COLORS.notExpensive} strokeWidth={2} strokeDasharray="5 4" dot={false} isAnimationActive={false} />
          <Line dataKey="tooExpensive" name="Too expensive" stroke={VW_COLORS.tooExpensive} strokeWidth={2.25} dot={false} isAnimationActive={false} />
          {points.map((p) =>
            p.price === null ? null : (
              <ReferenceDot
                key={p.key}
                x={p.price}
                y={p.y}
                r={4.5}
                fill="#047857"
                stroke="white"
                strokeWidth={2}
                label={
                  <PointLabel
                    label={p.key}
                    value={money(p.price, currency)}
                    dy={p.dy}
                    anchor={close ? (p.key === 'OPP' ? 'end' : p.key === 'IPP' ? 'start' : 'middle') : 'middle'}
                  />
                }
              />
            ),
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
