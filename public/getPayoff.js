export const payScale = 3
export const endowment = 6
export const cv = { 1: 1, 2: 1 }
export const decimals = 1
export const n = 10

let R0 = 1.5
let cd = { 1: 5, 2: 5 }

export function getR0 () { return R0 }
export function getCD () { return cd }

export function setTreatment (treatment) {
  if (treatment === '1' || treatment === '2') R0 = 1.5
  if (treatment === '3' || treatment === '4') R0 = 4
  if (treatment === '1' || treatment === '3') cd = { 1: 5, 2: 5 }
  if (treatment === '2' || treatment === '4') cd = { 1: 7, 2: 3 }
}

export function getPayoff (type, v, totalOtherV) {
  if (type === '?') return 0
  const meanV = (v + totalOtherV) / n
  const risk = v === 1 || meanV === 1 ? 0 : Math.max(0, 1 - 1 / ((1 - meanV) * R0))
  const payoff = endowment - cv[type] * v - cd[type] * risk
  return Number((payoff * payScale).toFixed(decimals))
}

export const getPayString = (type, v, totalOtherV) => {
  const payoff = getPayoff(type, v, totalOtherV)
  return payoff.toFixed(decimals)
}

export function range (a, b) {
  return [...Array(b - a + 1).keys()].map(i => i + a)
}
