import memoizerific from 'memoizerific';

import { formatEther, formatPercent, formatRep } from '../../../utils/format-number';
import { formatDate } from '../../../utils/format-date';
import { loadMarketsInfo } from '../../markets/actions/load-markets-info';
import { abi } from '../../../services/augurjs';
import { TWO } from '../../trade/constants/numbers';
import { SCALAR } from '../../markets/constants/market-types';
import store from '../../../store';
import { selectMarketLink } from '../../link/selectors/links';

export default function () {
  const { eventsWithAccountReport } = store.getState();

  if (!eventsWithAccountReport) {
    return [];
  }

  const reports = Object.keys(eventsWithAccountReport)
    .filter(eventID => !!eventsWithAccountReport[eventID].marketID)
    .map((eventID) => {
      const expirationDate = eventsWithAccountReport[eventID].expirationDate || null;
      const isFinal = eventsWithAccountReport[eventID].isFinal || null;
      const marketID = eventsWithAccountReport[eventID].marketID || null;
      const description = getMarketDescription(marketID);
      const marketLink = (marketID && description && selectMarketLink({ id: marketID, description }, store.dispatch)) || null;
      const marketOutcome = eventsWithAccountReport[eventID].marketOutcome;
      let outcome = null;
      if (marketOutcome !== '0') {
        outcome = selectMarketOutcome(eventsWithAccountReport[eventID].marketOutcome, marketID);
      }
      const outcomePercentage = (eventsWithAccountReport[eventID].proportionCorrect && formatPercent(abi.bignum(eventsWithAccountReport[eventID].proportionCorrect).times(100))) || null;
      const reported = selectMarketOutcome(eventsWithAccountReport[eventID].accountReport, marketID);
      const isReportEqual = (outcome != null && reported != null && outcome === reported) || null; // Can be done here
      const feesEarned = calculateFeesEarned(eventsWithAccountReport[eventID]);
      const repEarned = (eventsWithAccountReport[eventID].repEarned && formatRep(eventsWithAccountReport[eventID].repEarned)) || null;
      const endDate = (expirationDate && formatDate(expirationDate)) || null;
      const isChallenged = eventsWithAccountReport[eventID].isChallenged || null;
      const isChallengeable = isFinal != null && isChallenged != null && !isFinal && !isChallenged;
      const period = eventsWithAccountReport[eventID].period || null;
      const reportHash = eventsWithAccountReport[eventID].reportHash || null;
      const isCommitted = eventsWithAccountReport[eventID].isCommitted;
      const isRevealed = eventsWithAccountReport[eventID].isRevealed;
      const isUnethical = eventsWithAccountReport[eventID].isUnethical;

      return {
        eventID,
        marketID,
        marketLink,
        description,
        outcome,
        outcomePercentage,
        reported,
        isReportEqual,
        feesEarned,
        repEarned,
        endDate,
        isChallenged,
        isChallengeable,
        period,
        reportHash,
        isCommitted,
        isRevealed,
        isUnethical
      };
    })
    .sort((a, b) => {
      if (a.endDate && b.endDate && a.endDate.value && b.endDate.value) {
        return b.endDate.value.getTime() - a.endDate.value.getTime();
      }
      return 1;
    });

  return reports;
}

export const getMarketDescription = memoizerific(1000)((marketID) => {
  const { allMarkets } = require('../../../selectors');

  if (!allMarkets.filter(market => market.id === marketID)) {
    store.dispatch(loadMarketsInfo([marketID]));
    return null;
  }

  return (allMarkets.filter(market => market.id === marketID)[0] && allMarkets.filter(market => market.id === marketID)[0].description) || null;
});

export const calculateFeesEarned = (event) => {
  if (!event.marketFees || !event.repBalance || !event.eventWeight) return null;
  return formatEther(
    abi.bignum(event.marketFees)
      .times(abi.bignum(event.repBalance))
      .dividedBy(TWO)
      .dividedBy(abi.bignum(event.eventWeight)),
    { denomination: ' ETH' }
  );
};

export const selectMarketOutcome = memoizerific(1000)((outcomeID, marketID) => {
  if (!outcomeID || !marketID) return null;
  const { allMarkets } = require('../../../selectors');
  const filteredMarket = allMarkets.find(market => market.id === marketID);
  if (!filteredMarket) return null;
  if (filteredMarket.type === SCALAR) return outcomeID;
  const outcome = filteredMarket.reportableOutcomes.find(outcome => outcome.id === outcomeID);
  return outcome ? outcome.name : null;
});
