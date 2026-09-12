import type { ImageFactoryTarget } from './types'

export function buildImagePrompt(target: ImageFactoryTarget) {
  const place = [target.area, target.city].filter(Boolean).join(', ')
  const subject = target.variant === 'section'
    ? target.sectionHeading || target.title
    : target.service || target.title

  const vehicle = /bike|motorcycle|scooter/i.test(`${target.title} ${target.service ?? ''} ${target.category ?? ''}`)
    ? 'Indian motorcycle or scooter'
    : 'modern Indian passenger car'

  return [
    'Create a premium, ultra-realistic automotive service photograph for Fiixup, an Indian doorstep vehicle-service brand.',
    `Page subject: ${subject}.`,
    target.category ? `Service category: ${target.category}.` : '',
    place ? `Location context: ${place}, India. Keep the setting believable for that city without fake landmarks.` : 'Location: urban India.',
    `Primary vehicle: ${vehicle}.`,
    'Show the exact service problem or service action clearly and mechanically correctly. Use proper professional tools and believable technician posture.',
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
