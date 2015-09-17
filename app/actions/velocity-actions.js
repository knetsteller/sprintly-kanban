import _ from "lodash";
import request from 'superagent';
import AppDispatcher from '../dispatchers/app-dispatcher';
import {BASE_URL} from '../config';

const token = window.__token;
const DEFAULT_VELOCITY = 10;
const DEFAULT_ITERATION_LENGTH = 7;
const STATUS_XREF = {
  5: 'someday',
  10: 'backlog',
  20: 'in-progress',
  30: 'completed',
  40: 'accepted'
};

var internals = {
  request(id, metric, cb) {
    request
      .get(`${BASE_URL}/api/products/${id}/aggregate/${metric}.json`)
      .set('Authorization', `Bearer ${token}`)
      .end(cb);
  },

  calculateAverageVelocity(velocity={}) {
    velocity.average = Math.round(velocity.average * DEFAULT_ITERATION_LENGTH);

    if (velocity.average < 1) {
      velocity.average = DEFAULT_VELOCITY;
    }

    return velocity;
  },

  countsByStatus(totals={}) {
    let counts = _.transform(totals, function(result, v, k) {
      let totalsByType = _.values(v)
      let itemCount = _.reduce(
        _.map(totalsByType, function(v) { return v.items }),
        function(sum, num) { return sum + num }
      )
      let pointCount = _.reduce(
        _.map(totalsByType, function(v) { return v.points }),
        function(sum, num) { return sum + num }
      )
      result[STATUS_XREF[k]] = {items: itemCount, points: pointCount};
      return result
    })
    return counts
  }
};

var VelocityActions = {
  getVelocity(productId) {
    internals.request(productId, 'velocity', function(err, res) {
      if (err) {
        AppDispatcher.dispatch({
          actionType: 'PRODUCT_VELOCITY_ERROR'
        });
        return;
      }

      if (res.body) {
        let velocity = internals.calculateAverageVelocity(res.body);
        AppDispatcher.dispatch({
          actionType: 'PRODUCT_VELOCITY',
          payload: velocity,
          productId
        });
      }
    });
  },

  setVelocity: function(productId, velocity) {
    AppDispatcher.dispatch({
      actionType: 'PRODUCT_VELOCITY',
      payload: {
        average: velocity
      },
      productId
    });
  },

  getItemCounts(productId) {
    internals.request(productId, 'focus', function(err, res) {
      if (err) {
        AppDispatcher.dispatch({
          actionType: 'ITEM_COUNTS_ERROR'
        });
        return;
      }

      if (res.body) {
        let counts = internals.countsByStatus(res.body);
        AppDispatcher.dispatch({
          actionType: 'ITEM_COUNTS',
          payload: counts,
          productId
        });
      }
    });
  }
};

export default VelocityActions;
