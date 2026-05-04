import { motion } from 'framer-motion';

const inputClass =
  'w-full rounded-2xl border border-gold-400/20 bg-black/40 px-4 py-3 text-sm text-ivory-100 outline-none transition placeholder:text-ivory-100/30 focus:border-gold-300/70 focus:ring-2 focus:ring-gold-400/20';

function BirthDetailsForm({ formData, onChange, onSubmit, isLoading }) {
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
        <h2 className="mt-3 font-serif text-3xl text-ivory-50">Generate your Kundali</h2>
        <p className="mt-3 text-sm leading-6 text-ivory-100/60">
          Enter precise birth details. GrahaPath will use the backend chart engine and return only
          calculated placements and interpretations.
        </p>
      </div>

      <div className="grid gap-4">
        <label className="space-y-2">
          <span className="text-xs uppercase tracking-[0.22em] text-ivory-100/50">Name</span>
          <input
            className={inputClass}
            name="name"
            value={formData.name}
            onChange={onChange}
            placeholder="Your name"
            required
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2">
            <span className="text-xs uppercase tracking-[0.22em] text-ivory-100/50">Date</span>
            <input
              className={inputClass}
              name="date"
              type="date"
              value={formData.date}
              onChange={onChange}
              required
            />
          </label>
          <label className="space-y-2">
            <span className="text-xs uppercase tracking-[0.22em] text-ivory-100/50">Time</span>
            <input
              className={inputClass}
              name="time"
              type="time"
              value={formData.time}
              onChange={onChange}
              required
            />
          </label>
        </div>

        <label className="space-y-2">
          <span className="text-xs uppercase tracking-[0.22em] text-ivory-100/50">Place</span>
          <input
            className={inputClass}
            name="place"
            value={formData.place}
            onChange={onChange}
            placeholder="City, Country"
            required
          />
        </label>
      </div>

      <motion.button
        whileHover={{ scale: isLoading ? 1 : 1.02 }}
        whileTap={{ scale: isLoading ? 1 : 0.98 }}
        disabled={isLoading}
        className="mt-6 w-full rounded-2xl border border-gold-300/50 bg-gold-gradient px-5 py-4 text-sm font-semibold uppercase tracking-[0.25em] text-black shadow-glow transition disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoading ? 'Calculating...' : 'Reveal Chart'}
      </motion.button>
    </motion.form>
  );
}

export default BirthDetailsForm;
