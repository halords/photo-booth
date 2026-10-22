import Icon from './Icon';
export default function Steps({ current }: { current: number }) {
  return <ol className="workflow-steps" aria-label="Photo booth progress">{['Set the scene', 'Strike a pose', 'Make it yours', 'Keep & share'].map((label, i) => <li key={label} className={current === i ? 'current' : current > i ? 'complete' : ''} aria-current={current === i ? 'step' : undefined}><span>{current > i ? <Icon name="check" size={13} /> : String(i + 1).padStart(2, '0')}</span><span>{label}</span></li>)}</ol>;
}
