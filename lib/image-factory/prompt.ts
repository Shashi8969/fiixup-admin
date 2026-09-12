import type { ImageFactoryTarget } from './types'

function serviceDirection(text: string) {
  const value = text.toLowerCase()

  if (/jump\s*start|dead battery|battery jump/.test(value)) {
    return 'Show a portable professional jump starter or booster pack connected correctly to the battery terminals. Do not show unsafe improvised wiring or car-to-car jumper cables unless the page specifically asks for that.'
  }
  if (/puncture|flat tyre|flat tire|tyre repair|tire repair/.test(value)) {
    return 'Show a genuine puncture-repair workflow: safely jacked vehicle or accessible wheel, realistic tyre inspection/plug-patch tools, compressor or pressure gauge where relevant. The tyre condition must visibly match the repair being performed.'
  }
  if (/battery replacement|replace battery|car battery|bike battery/.test(value)) {
    return 'Show a realistic battery service: correct battery location, insulated tools, terminal inspection and optionally a multimeter or battery tester. Battery polarity and cable placement must look correct.'
  }
  if (/oil change|engine oil|oil service/.test(value)) {
    return 'Show a clean oil-change workflow with a drain pan, oil filter tools and sealed fresh oil container. No oil spilling onto the road and no impossible access to engine parts.'
  }
  if (/brake|braking/.test(value)) {
    return 'Show a mechanically correct brake inspection or repair with the wheel removed when appropriate, exposing the disc/rotor, caliper and pads. Use proper hand tools and safe support stands.'
  }
  if (/\bac\b|air conditioning|air-condition|cooling service/.test(value)) {
    return 'Show a real automotive AC diagnostic/service scene using manifold gauges, refrigerant service equipment or temperature testing as appropriate, with believable hose connections and engine-bay access.'
  }
  if (/tow|towing|breakdown recovery/.test(value)) {
    return 'Show a legitimate roadside recovery scene with a flatbed or wheel-lift tow setup, proper winch/straps and safe vehicle loading. Do not depict an unsafe improvised tow.'
  }
  if (/starter motor|self start|self-start/.test(value)) {
    return 'Show realistic electrical diagnosis around the starter/battery circuit using a multimeter or scan tool, with the technician working from a physically plausible access point.'
  }
  if (/alternator|charging system/.test(value)) {
    return 'Show charging-system diagnosis with a multimeter or battery/alternator tester at the engine bay. Connections and component placement should be physically believable.'
  }
  if (/diagnostic|scanner|check engine|engine light|obd/.test(value)) {
    return 'Show a technician using a professional OBD diagnostic scanner or tablet connected correctly to the vehicle, with a realistic engine-bay or dashboard diagnostic context.'
  }
  if (/service|maintenance|general repair|mechanic/.test(value)) {
    return 'Show a specific hands-on maintenance action rather than a mechanic merely posing beside the vehicle: inspection, testing, tightening, fluid check or component repair with appropriate tools.'
  }

  return 'Depict the page topic as a specific, physically believable automotive action. Choose tools and vehicle access points that an experienced Indian mechanic would actually use.'
}

export function buildImagePrompt(target: ImageFactoryTarget) {
  const place = [target.area, target.city].filter(Boolean).join(', ')
  const subject = target.variant === 'section'
    ? target.sectionHeading || target.title
    : target.service || target.title
  const context = `${target.title} ${target.service ?? ''} ${target.category ?? ''} ${target.sectionHeading ?? ''}`

  const vehicle = /bike|motorcycle|scooter|royal enfield|two.?wheeler/i.test(context)
    ? 'Indian motorcycle or scooter'
    : 'modern Indian passenger car'

  return [
    'Create a premium, ultra-realistic automotive service photograph for Fiixup, an Indian doorstep vehicle-service brand.',
    `Page subject: ${subject}.`,
    target.category ? `Service category: ${target.category}.` : '',
    place ? `Location context: ${place}, India. Keep the setting believable for that city without fake landmarks.` : 'Location: urban India.',
    `Primary vehicle: ${vehicle}.`,
    serviceDirection(context),
    'Show the exact service problem or service action clearly and mechanically correctly. Use proper professional tools, safe working practice and believable technician posture.',
    'Technician clothing: clean navy mechanic polo with subtle red piping. Do not invent logos, badges, license plates, prices, discounts, ratings, certifications, or claims.',
    'Visual style: premium commercial automotive photography, natural Indian daylight, realistic skin and fabric, authentic tools, crisp subject, shallow depth of field, clean background, high detail, no obvious AI artifacts.',
    'Composition: 3:2 landscape hero image, strong visual story, with useful negative space near a corner for a later exact brand overlay. Do not generate text, logos, or watermarks in the scene.',
    'Make it attention-grabbing and high-CTR while truthful to the service. Avoid sensational damage, unsafe practices, impossible tools, extra fingers, warped wheels, distorted vehicles, fake brand marks, or unrelated service trucks.',
  ].filter(Boolean).join(' ')
}

export function buildAltText(target: ImageFactoryTarget) {
  const place = [target.area, target.city].filter(Boolean).join(', ')
  const subject = target.variant === 'section'
    ? target.sectionHeading || target.title
    : target.service || target.title

  return `Fiixup ${subject}${place ? ` in ${place}` : ''} doorstep service`
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 180)
}
