import { TOGGLE_FAVORITE } from '../../markets/actions/toggle-favorite';

export default function(favorites = { }, action) {
    var newFavorites;

    switch (action.type) {
        case TOGGLE_FAVORITE:
            newFavorites = {
                ...favorites
            };
            if (newFavorites[action.marketID]) {
                delete newFavorites[action.marketID];
            }
            else {
                newFavorites[action.marketID] = Date.now();
            }
            return newFavorites;

        default:
            return favorites;
    }
}