/**
 * GrahaPath Chat Brain — intent only (no report / life-phase modes).
 */

function detectIntent(rawText) {
  const t = String(rawText || '').trim();
  const lower = t.toLowerCase();

  if (
    /(deep\s+analysis|full\s+chart|decode\s+my\s+core|core\s+nature|technical\s+astrolog|house\s+lord|houses\s+and\s+planets|dasha\s+layer|complete\s+(decode|reading|breakdown)|detailed\s+report|chart\s+in\s+depth|break\s*down\s+my\s+chart|पूर्ण\s*विश्लेषण|विस्तृत\s*विश्लेषण|विस्तृत\s*व्याख्या|गहिरो\s*विश्लेषण)/i.test(
      t
    )
  ) {
    return 'deep_analysis';
  }

  if (
    /((timilai|तिमीलाई|तिमीले).*(garchau|gardachau|gardau|garcha|sakchau|sakdin|गर्छौ|गर्दछौ|सक्छौ)|k\s+k\s+kura|के\s+के\s+कुरा|kun\s+kun|कुन\s+कुन|what\s+can\s+you(?:\s+do)?|what\s+do\s+you\s+cover|what\s+topics|what\s+can\s+you\s+predict|भविष्यवाणी|bhawisyawani|bhawisya|fortune\s+tell|predict\s+for\s+me)/i.test(
      t
    )
  ) {
    return 'capability_question';
  }

  if (
    /(?:^|\s)(today|tomorrow|daily|day after|next\s+2\s+days|two\s+days|gochar|गोचर|transit|my\s+day)(?:\s|$)/i.test(
      lower
    ) ||
    /(aaja|aja|aaja\s+ko|parsa|parsi|parsiko|भोलि|पर्सि|पर्सी|दैनिक|आज|आजको|भोलिको|भोली)/i.test(t) ||
    /mero\s+(aaja|parsa|bholi)/i.test(lower) ||
    /(how\s+is\s+my\s+day|what\s+does\s+today)/i.test(lower)
  ) {
    return 'daily_forecast';
  }

  if (
    /(mero\s+rashifal|my\s+zodiac|my\s+rashi|what\s+is\s+my\s+moon\s+sign|what\s+is\s+my\s+rashi|राशिफल|मेरो\s*राशि|मेरो\s*राशिफल|मेरो\s*चन्द्र\s*राशि)/i.test(
      t
    )
  ) {
    return 'natal_rashi_question';
  }

  if (/(mantra|remedy|remedies|upaya|उपाय|puja|पूजा|kasari\s+fix|ratna|रत्न|gemstone)/i.test(t)) {
    return 'remedy_question';
  }

  if (
    /(dasha|mahadasha|antardasha|antar dasha|pratyantar|vimshottari|timing|current\s+phase|life\s+phase|what\s+phase\s+am\s+i\s+in|what\s+does\s+my\s+dasha\s+say|why\s+is\s+life\s+changing|why\s+am\s+i\s+feeling\s+pressure|timing\s+am\s+i\s+under)/i.test(
      lower
    )
  ) {
    return 'dasha_question';
  }

  if (
    /(career|job|profession|startup|business|promotion|10th\s*house|tenth\s*house|which\s+profession|mero\s+career|public\s+recognition|mass\s+recognition|fame|famous|celebrity|visibility|reputation|प्रशंसा|चर्चा|चर्चित)/i.test(
      lower
    )
  ) {
    return 'career_question';
  }

  if (
    /(relationship|marriage|spouse|love\s+life|partner|compatibility|7th\s*house|seventh|विवाह|प्रेम)/i.test(lower)
  ) {
    return 'relationship_question';
  }

  if (
    /(why\s+do\s+i|why\s+am\s+i|overthink|over\s+think|emotional|attached|withdraw|pressure|stress|feel\s+anxious|मन\s+अशान्त|चिन्ता)/i.test(
      lower
    )
  ) {
    return 'emotional_pattern';
  }

  if (
    /^(hi|hello|hey|hiya|yo|sup|namaste|namaskar|k\s*cha|ke\s*cha|क\s*च|के\s*च|what'?s\s+up|how\s+are\s+you|how\s+am\s+i|how\s+ru)\b/i.test(
      lower.replace(/[!?.…]+$/u, '').trim()
    ) ||
    /^(thanks|thank\s+you|thx|ok|okay|bye)\b/i.test(lower.replace(/[!?.…]+$/u, '').trim())
  ) {
    return 'small_talk';
  }

  return 'general_question';
}

module.exports = { detectIntent };
