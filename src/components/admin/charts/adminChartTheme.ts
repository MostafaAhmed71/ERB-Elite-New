/** ثيم Nivo مخصص لأولمبياد النخبة — داكن + ذهبي */
export const adminChartTheme = {
  background: 'transparent',
  text: {
    fontSize: 12,
    fill: '#A3AED0',
    fontFamily: 'Cairo, sans-serif',
  },
  axis: {
    domain: { line: { stroke: 'rgba(255,255,255,0.08)', strokeWidth: 1 } },
    legend: { text: { fontSize: 12, fill: '#A3AED0', fontFamily: 'Cairo, sans-serif' } },
    ticks: {
      line: { stroke: 'rgba(255,255,255,0.08)', strokeWidth: 1 },
      text: { fontSize: 11, fill: '#A3AED0', fontFamily: 'Cairo, sans-serif' },
    },
  },
  grid: {
    line: { stroke: 'rgba(255,255,255,0.05)', strokeWidth: 1 },
  },
  legends: {
    text: { fontSize: 11, fill: '#A3AED0', fontFamily: 'Cairo, sans-serif' },
  },
  tooltip: {
    container: {
      background: '#111c44',
      color: '#fff',
      fontSize: 12,
      borderRadius: 12,
      border: '1px solid rgba(240,180,41,0.25)',
      fontFamily: 'Cairo, sans-serif',
      boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
      padding: '8px 12px',
    },
  },
};

export const CHART_COLORS = {
  gold: '#f0b429',
  goldDim: 'rgba(240,180,41,0.35)',
  blue: '#4481EB',
  blueDim: 'rgba(68,129,235,0.35)',
  emerald: '#01B574',
  purple: '#7551FF',
  red: '#ef4444',
};
