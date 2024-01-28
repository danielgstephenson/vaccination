const payScale = 3

export function getPayoff (v, totalOtherV, n, cv, cd, endowment, R0) {
  const meanV = (v + totalOtherV) / n
  const risk = v === 1 || meanV === 1 ? 0 : Math.max(0, 1 - 1 / ((1 - meanV) * R0))
  const payoff = endowment - cv * v - cd * risk
  return payoff * payScale
}
