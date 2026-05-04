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
  const selectedBsMonth = nepaliMonths[Number(bsDate.month) - 1];

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
                  placeholder="12"
                  maxLength={2}
                  helper={selectedBsMonth || '1-12'}
                  onChange={(value) => handleBsDateChange('month', value)}
                />
                <TypedBsInput
                  label="BS Day"
                  value={bsDate.day}
                  placeholder="19"
                  maxLength={2}
                  onChange={(value) => handleBsDateChange('day', value)}
                />
              </div>
              <div className="rounded-2xl border border-gold-300/10 bg-black/25 px-4 py-3 text-xs leading-5 text-ivory-100/52">
                Type BS date as numbers. Month guide: 1 Baisakh, 2 Jestha, 3 Ashadh,
                4 Shrawan, 5 Bhadra, 6 Ashwin, 7 Kartik, 8 Mangsir, 9 Poush,
                10 Magh, 11 Falgun, 12 Chaitra.
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

function TypedBsInput({ label, value, placeholder, maxLength, helper, onChange }) {
  return (
    <label className="rounded-2xl border border-gold-400/15 bg-black/35 px-4 py-3 transition focus-within:border-gold-300/60 focus-within:ring-2 focus-within:ring-gold-400/15">
      <span className="block text-[10px] uppercase tracking-[0.22em] text-gold-200/50">
        {label}
      </span>
      <input
        className="mt-1 w-full bg-transparent text-sm text-ivory-100 outline-none placeholder:text-ivory-100/28"
        inputMode="numeric"
        value={value || ''}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        required
      />
      {helper && (
        <span className="mt-1 block text-[11px] text-gold-200/55">{helper}</span>
      )}
    </label>
  );
}

export default BirthDetailsForm;
