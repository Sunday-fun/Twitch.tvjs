'use strict';

const Utils = require('../utils/Utils');
const Message = require('./Message');
const { Events_Resolvers, Events } = require('../utils/Constants');

/**
 * A message user structure
 */
class Viewer {
  constructor(client, data) {
    /**
     * The client that instantiated this
     * @type {Client}
     */
    Object.defineProperty(this, 'client', { value: client });

    /**
     * Viewer display name
     * @type {string}
     */
    this.username = data['display-name'];

    /**
     * Viewer id
     * @type {string}
     */
    this.id = data['user-id'];

    /**
     * Whether the viewer is mod
     * @type {boolean}
     */
    this.mod = data.mod == '1';

    /**
     * Viewers channel color
     * @type {?string}
     */
    this.color = typeof data.color == 'string' ? data.color : null;

    /**
     * Viewers chat badges
     * @type {string}
     */
    this.badges = data.badges;

    /**
     * Whether the viewer is a subscriber on this channel
     * @type {boolean}
     */
    this.subscriber = data.subscriber == '1';

    /**
     * The channel from where the viewer was reserved
     * @type {Channel}
     */
    this.channel = client.channels.get(data.channel);
  }

  /**
   * Ban this Viewer from Channel
   * @param {string} [reason] - ban reason
   * @returns {Promise<Viewer>}
   */
  ban(reason) {
    return new Promise((resolve, reject) => {
      if (reason && typeof reason !== 'string') throw new Error('Parameter "reason" must be string');
      let msg = Utils.buildMessage(this.client, `/ban ${this.username} ${reason}`, this.channel.name);
      this.client.ws.on(Events_Resolvers.VIEWER_BAN_ERROR, (error) => msg = { error });
      this.client.ws.on(Events_Resolvers.VIEWER_BAN_SUCCESS, () => {
        this.client.emit(Events.VIEWER_BAN, this);
      });
      setTimeout(() => {
        if (msg instanceof Message) {
          resolve(this);
        } else reject(msg.error);
      }, 200);
    });
  }

  /**
   * Timeout viewer from channel
   * @param {number} [time=60000] - timeout time
   * @returns {Promise<Viewer>}
   */
  timeout(time = 60000) {
    return new Promise((resolve, reject) => {
      if (typeof time !== 'number') throw new Error('Parameter "time" must be number in Milliseconds');
      time = Math.floor((time / (1000))).toString();
      let msg = Utils.buildMessage(this.client, `/timeout ${this.username} ${time}`, this.channel.name);
      this.client.ws.on(Events_Resolvers.VIEWER_TIMEOUT_ERROR, (error) => msg = { error });
      this.client.ws.on(Events_Resolvers.VIEWER_TIMEOUT_SUCCESS, () => {
        this.client.emit(Events.VIEWER_TIMEOUT, this);
      });
      setTimeout(() => {
        if (msg instanceof Message) {
          resolve(this);
        } else reject(msg.error);
      }, 200);
    });
  }
}

module.exports = Viewer;