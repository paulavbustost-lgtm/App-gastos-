import { currentPeriodKey, periodLabel, shiftPeriod, type PeriodKey } from '../lib/date'
import { IconChevronLeft, IconChevronRight } from './Icons'

interface Props {
  value: PeriodKey
  cutDay: number
  onChange: (key: PeriodKey) => void
}

export function PeriodPicker({ value, cutDay, onChange }: Props) {
  const atCurrent = value >= currentPeriodKey(cutDay)

  return (
    <div className="period">
      <button
        className="period__nav"
        onClick={() => onChange(shiftPeriod(value, -1))}
        aria-label="Período anterior"
      >
        <IconChevronLeft />
      </button>
      <button
        className="period__label"
        onClick={() => onChange(currentPeriodKey(cutDay))}
        title="Volver al período actual"
      >
        {periodLabel(value, cutDay)}
      </button>
      <button
        className="period__nav"
        onClick={() => onChange(shiftPeriod(value, 1))}
        disabled={atCurrent}
        aria-label="Período siguiente"
      >
        <IconChevronRight />
      </button>
    </div>
  )
}
