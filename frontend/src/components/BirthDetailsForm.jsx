import { useState } from 'react';
import { motion } from 'framer-motion';

const inputClass =
  'w-full rounded-2xl border border-gold-400/20 bg-black/40 px-4 py-3 text-sm text-ivory-100 outline-none transition placeholder:text-ivory-100/30 focus:border-gold-300/70 focus:ring-2 focus:ring-gold-400/20';
const helperClass = 'text-xs leading-5 text-ivory-100/45';
const labelClass = 'text-xs uppercase tracking-[0.22em] text-ivory-100/50';

const nepaliMonths = [
  'Baisakh',
  'Jestha',
  'Ashadh',
  'Shrawan',
  'Bhadra',
  'Ashwin',
  'Kartik',
  'Mangsir',
  'Poush',
  'Magh',
  'Falgun',
  'Chaitra'
];

const hourOptions = Array.from({ length: 12 }, (_item, index) => String(index + 1).padStart(2, '0'));
const minuteOptions = Array.from({ length: 60 }, (_item, index) => String(index).padStart(2, '0'));

function formatAdDisplay(value) {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  const parts = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)].filter(Boolean);

  return parts.join(' / ');
}

function formatTimeDisplay(value) {
  const normalized = value.toUpperCase().replace(/[^0-9APM]/g, '').slice(0, 6);
  const numeric = normalized.replace(/[APM]/g, '').slice(0, 4);
  const meridiem = normalized.includes('P') ? 'PM' : normalized.includes('A') ? 'AM' : '';
  const timeParts = [numeric.slice(0, 2), numeric.slice(2, 4)].filter(Boolean);

  return `${timeParts.join(' : ')}${meridiem ? ` ${meridiem}` : ''}`;
}

function formatSelectedTime(timeParts) {
  return `${timeParts.hour || 'HH'} : ${timeParts.minute || 'MM'} ${timeParts.meridiem || 'AM/PM'}`;
}

function BirthDetailsForm({ formData, onChange, onSubmit, isLoading }) {
  const [isMonthOpen, setIsMonthOpen] = useState(false);
  const dateType = formData.dateType || 'AD';
  const bsDate = formData.bsDate || { year: 2053, month: 12, day: 19 };
  const timeParts = formData.timeParts || { hour: '', minute: '', meridiem: 'AM' };

  function handleDateTypeChange(nextDateType) {
    onChange({
      target: {
        name: 'dateType',
        value: nextDateType
      }
    });
  }

  function handleBsDateChange(field, rawValue) {
    const maxLength = field === 'year' ? 4 : 2;
    const value = rawValue.replace(/\D/g, '').slice(0, maxLength);

    onChange({
      target: {
        name: 'bsDate',
        value: {
          ...bsDate,
          [field]: value
        }
      }
    });
  }

  function handleAdDateChange(event) {
    onChange({
      target: {
        name: 'dateDisplay',
        value: formatAdDisplay(event.target.value)
      }
    });
  }

  function handleTimeChange(event) {
    onChange({
      target: {
        name: 'timeDisplay',
        value: formatTimeDisplay(event.target.value)
      }
    });
  }

  function handleTimePartChange(field, value) {
    const nextTimeParts = {
      ...timeParts,
      [field]: value
    };

    onChange({
      target: {
        name: 'timeParts',
        value: nextTimeParts
      }
    });

    onChange({
      target: {
        name: 'timeDisplay',
        value: formatSelectedTime(nextTimeParts)
      }
    });
  }

  return (
    <motion.form
      onSubmit={onSubmit}
      className="glass-panel rounded-[2rem] p-6 shadow-glow md:p-8"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: 'easeOut' }}
    >
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.35em] text-gold-300/80">Birth Details</p>
        <h2 className="mt-3 font-serif text-3xl text-ivory-50">Enter Your Birth Details</h2>
        <p className="mt-3 text-sm leading-6 text-ivory-100/60">
          GrahaPath calculates your planetary placements from your exact birth date, time, and
          place.
        </p>
      </div>

      <div className="grid gap-4">
        <label className="space-y-2">
          <span className={labelClass}>Name</span>
          <input
            className={inputClass}
            name="name"
            value={formData.name}
            onChange={onChange}
            placeholder="Your name"
            required
          />
        </label>

        <div className="space-y-3 rounded-3xl border border-gold-400/10 bg-black/20 p-4">
          <div className="grid gap-2 rounded-2xl border border-gold-400/15 bg-black/30 p-1 sm:grid-cols-2">
            {['AD', 'BS'].map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => handleDateTypeChange(option)}
                className={`rounded-xl px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition ${
                  dateType === option
                    ? 'bg-gold-gradient text-black shadow-glow'
                    : 'text-ivory-100/55 hover:bg-white/5 hover:text-gold-200'
                }`}
              >
                {option === 'AD' ? 'English Date (AD)' : 'Nepali Date (BS)'}
              </button>
            ))}
          </div>

          {dateType === 'AD' ? (
            <label className="space-y-2">
              <span className={labelClass}>Date</span>
              <input
                className={inputClass}
                name="dateDisplay"
                inputMode="numeric"
                value={formData.dateDisplay || ''}
                onChange={handleAdDateChange}
                placeholder="DD / MM / YYYY"
                required
              />
              <div className="flex items-center justify-between gap-3">
                <p className={helperClass}>DD / MM / YYYY</p>
                <p className={helperClass}>Use your English birth date.</p>
              </div>
            </label>
          ) : (
            <div className="space-y-2">
              <span className={labelClass}>Nepali Date (BS)</span>
              <div className="grid gap-3 sm:grid-cols-[1fr_1.25fr_1fr]">
                <TypedBsInput
                  label="BS Year"
                  value={bsDate.year}
                  placeholder="2053"
                  maxLength={4}
                  onChange={(value) => handleBsDateChange('year', value)}
                />
                <TypedBsInput
                  label="BS Month"
                  value={bsDate.month}
                  placeholder="Month"
                  displayValue={nepaliMonths[Number(bsDate.month) - 1] || ''}
                  readOnly
                  onClick={() => setIsMonthOpen((current) => !current)}
                  onChange={(value) => handleBsDateChange('month', value)}
                >
                  {isMonthOpen && (
                    <MonthMenu
                      selectedMonth={Number(bsDate.month)}
                      onSelect={(month) => {
                        handleBsDateChange('month', String(month));
                        setIsMonthOpen(false);
                      }}
                    />
                  )}
                </TypedBsInput>
                <TypedBsInput
                  label="BS Day"
                  value={bsDate.day}
                  placeholder="19"
                  maxLength={2}
                  onChange={(value) => handleBsDateChange('day', value)}
                />
              </div>
              <p className={helperClass}>
                We automatically convert Nepali date to calculation format.
              </p>
            </div>
          )}
        </div>

        <div className="grid gap-4">
          <div className="space-y-2">
            <span className={labelClass}>Birth Time</span>
            <TimePicker
              timeParts={timeParts}
              onChange={handleTimePartChange}
            />
            <p className={helperClass}>
              Enter exact birth time. Even a few minutes can affect Lagna and house placements.
            </p>
            <p className="text-xs leading-5 text-gold-200/55">
              Even a 5-10 minute difference can affect your chart accuracy.
            </p>
          </div>
        </div>

        <label className="space-y-2">
          <span className={labelClass}>Birth Place</span>
          <input
            className={inputClass}
            name="place"
            value={formData.place}
            onChange={onChange}
            placeholder="City, Country"
            required
          />
          <p className={helperClass}>Timezone is automatically calculated from your birth place.</p>
        </label>
      </div>

      <motion.button
        whileHover={{ scale: isLoading ? 1 : 1.02 }}
        whileTap={{ scale: isLoading ? 1 : 0.98 }}
        disabled={isLoading}
        className="mt-6 w-full rounded-2xl border border-gold-300/50 bg-gold-gradient px-5 py-4 text-sm font-semibold uppercase tracking-[0.25em] text-black shadow-glow transition disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoading ? 'Calculating...' : 'Calculate My Chart'}
      </motion.button>
    </motion.form>
  );
}

function TimePicker({ timeParts, onChange }) {
  function setNoon() {
    onChange('hour', '12');
    onChange('minute', '00');
    onChange('meridiem', 'PM');
  }

  return (
    <div className="rounded-3xl border border-gold-400/12 bg-black/25 p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-[10px] uppercase tracking-[0.22em] text-gold-200/50">Select Time</p>
        <button
          type="button"
          onClick={setNoon}
          className="rounded-full border border-gold-300/20 bg-gold-300/8 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-gold-100/80 transition hover:border-gold-300/40 hover:bg-gold-300/14"
        >
          Set 12:00 PM
        </button>
      </div>
      <div className="grid grid-cols-[1fr_1fr_auto] gap-3">
        <TimeColumn
          label="Hour"
          value={timeParts.hour}
          options={hourOptions}
          onSelect={(value) => onChange('hour', value)}
        />
        <TimeColumn
          label="Minute"
          value={timeParts.minute}
          options={minuteOptions}
          onSelect={(value) => onChange('minute', value)}
        />
        <div className="grid gap-2">
          {['AM', 'PM'].map((meridiem) => {
            const isSelected = timeParts.meridiem === meridiem;

            return (
              <button
                key={meridiem}
                type="button"
                onClick={() => onChange('meridiem', meridiem)}
                className={`rounded-2xl border px-4 py-3 text-xs font-semibold tracking-[0.18em] transition ${
                  isSelected
                    ? 'border-gold-300/40 bg-gold-300/18 text-gold-100'
                    : 'border-gold-400/12 bg-black/35 text-ivory-100/55 hover:border-gold-300/35 hover:text-gold-100'
                }`}
              >
                {meridiem}
              </button>
            );
          })}
        </div>
      </div>
      <p className="mt-3 rounded-2xl border border-gold-300/10 bg-black/25 px-4 py-2 text-center text-sm text-gold-100/85">
        Selected time: {formatSelectedTime(timeParts)}
      </p>
    </div>
  );
}

function TimeColumn({ label, value, options, onSelect }) {
  return (
    <div className="rounded-2xl border border-gold-400/12 bg-black/35 p-2">
      <p className="px-2 pb-2 text-[10px] uppercase tracking-[0.22em] text-gold-200/50">{label}</p>
      <div className="max-h-32 overflow-y-auto pr-1">
        <div className="grid gap-1">
          {options.map((option) => {
            const isSelected = value === option;

            return (
              <button
                key={option}
                type="button"
                onClick={() => onSelect(option)}
                className={`rounded-xl px-2 py-2 text-sm transition ${
                  isSelected
                    ? 'border border-gold-300/35 bg-gold-300/18 text-gold-100'
                    : 'text-ivory-100/65 hover:bg-gold-300/8 hover:text-gold-100'
                }`}
              >
                {option}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MonthMenu({ selectedMonth, onSelect }) {
  return (
    <div className="absolute left-0 right-0 top-[calc(100%+0.4rem)] z-40 rounded-2xl border border-gold-300/15 bg-[#0f0e0b]/95 p-2 shadow-[0_18px_42px_rgba(0,0,0,0.45)] backdrop-blur-xl">
      <div className="grid max-h-56 gap-1 overflow-y-auto pr-1">
        {nepaliMonths.map((month, index) => {
          const value = index + 1;
          const isSelected = selectedMonth === value;

          return (
            <button
              key={month}
              type="button"
              onClick={() => onSelect(value)}
              className={`rounded-xl px-3 py-2 text-left text-sm transition ${
                isSelected
                  ? 'border border-gold-300/35 bg-gold-300/18 text-gold-100'
                  : 'text-ivory-100/72 hover:bg-gold-300/8 hover:text-gold-100'
              }`}
            >
              {month}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TypedBsInput({
  label,
  value,
  placeholder,
  maxLength,
  helper,
  displayValue,
  readOnly = false,
  onClick,
  onChange,
  children
}) {
  return (
    <label className="relative rounded-2xl border border-gold-400/15 bg-black/35 px-4 py-3 transition focus-within:border-gold-300/60 focus-within:ring-2 focus-within:ring-gold-400/15">
      <span className="block text-[10px] uppercase tracking-[0.22em] text-gold-200/50">
        {label}
      </span>
      <input
        className="mt-1 w-full bg-transparent text-sm text-ivory-100 outline-none placeholder:text-ivory-100/28"
        inputMode="numeric"
        value={displayValue || value || ''}
        readOnly={readOnly}
        onClick={onClick}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        required
      />
      {helper && (
        <span className="mt-1 block text-[11px] text-gold-200/55">{helper}</span>
      )}
      {children}
    </label>
  );
}

export default BirthDetailsForm;
