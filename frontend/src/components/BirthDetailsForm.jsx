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

const bsYears = Array.from({ length: 91 }, (_item, index) => 2000 + index);
const bsDays = Array.from({ length: 32 }, (_item, index) => index + 1);

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

function BirthDetailsForm({ formData, onChange, onSubmit, isLoading }) {
  const dateType = formData.dateType || 'AD';
  const bsDate = formData.bsDate || { year: 2053, month: 12, day: 19 };

  function handleDateTypeChange(nextDateType) {
    onChange({
      target: {
        name: 'dateType',
        value: nextDateType
      }
    });
  }

  function handleBsDateChange(field, rawValue) {
    onChange({
      target: {
        name: 'bsDate',
        value: {
          ...bsDate,
          [field]: Number(rawValue)
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
                <select
                  className={inputClass}
                  value={bsDate.year}
                  onChange={(event) => handleBsDateChange('year', event.target.value)}
                  required
                >
                  {bsYears.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
                <select
                  className={inputClass}
                  value={bsDate.month}
                  onChange={(event) => handleBsDateChange('month', event.target.value)}
                  required
                >
                  {nepaliMonths.map((month, index) => (
                    <option key={month} value={index + 1}>
                      {month}
                    </option>
                  ))}
                </select>
                <select
                  className={inputClass}
                  value={bsDate.day}
                  onChange={(event) => handleBsDateChange('day', event.target.value)}
                  required
                >
                  {bsDays.map((day) => (
                    <option key={day} value={day}>
                      {day}
                    </option>
                  ))}
                </select>
              </div>
              <p className={helperClass}>
                Use your Nepali birth date. GrahaPath will convert it to English date before
                calculation.
              </p>
            </div>
          )}
        </div>

        <div className="grid gap-4">
          <label className="space-y-2">
            <span className={labelClass}>Birth Time</span>
            <input
              className={inputClass}
              name="timeDisplay"
              value={formData.timeDisplay || ''}
              onChange={handleTimeChange}
              placeholder="HH : MM AM/PM"
              required
            />
            <p className={helperClass}>
              Enter exact birth time. Even a few minutes can affect Lagna and house placements.
            </p>
            <p className="text-xs leading-5 text-gold-200/55">
              Even a 5-10 minute difference can affect your chart accuracy.
            </p>
          </label>
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

export default BirthDetailsForm;
