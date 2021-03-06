'use strict';

const Message = require('../structure/Message');
const Whisper = require('../structure/Whisper');
const { Events_Resolvers } = require('./Constants');

class Utils {
  constructor() {
    throw new Error(`The ${this.constructor.name} class may not be instantiated.`);
  }

  /**
   * <info>Copyright (c) 2013-2015, Fionn Kelleher All rights reserved.
   * @license {BSD-2-Clause} {@link https://github.com/sigkell/irc-message/blob/master/index.js}</info>
   * @param {string} data Mesasge string data
   * @returns {message}
   */
  static unpack(data) {
    const message = {
      raw: data,
      tags: {},
      prefix: null,
      command: null,
      params: [],
    };

    // position and nextspace are used by the parser as a reference.
    let position = 0;
    let nextspace = 0;

    // The first thing we check for is IRCv3.2 message tags.
    // http://ircv3.atheme.org/specification/message-tags-3.2

    if (data.charCodeAt(0) === 64) {
      const nextspace = data.indexOf(' ');

      if (nextspace === -1) {
        // Malformed IRC message.
        return null;
      }

      // Tags are split by a semi colon.
      const rawTags = data.slice(1, nextspace).split(';');

      for (let i = 0; i < rawTags.length; i++) {
        // Tags delimited by an equals sign are key=value tags.
        // If there's no equals, we assign the tag a value of true.
        const tag = rawTags[i];
        const pair = tag.split('=');
        message.tags[pair[0]] = pair[1] || true;
      }

      position = nextspace + 1;
    }

    // Skip any trailing whitespace.
    while (data.charCodeAt(position) === 32) {
      position++;
    }

    // Extract the message's prefix if present. Prefixes are prepended
    // with a colon.

    if (data.charCodeAt(position) === 58) {
      nextspace = data.indexOf(' ', position);

      // If there's nothing after the prefix, deem this message to be
      // malformed.
      if (nextspace === -1) {
        // Malformed IRC message.
        return null;
      }

      message.prefix = data.slice(position + 1, nextspace);
      position = nextspace + 1;

      // Skip any trailing whitespace.
      while (data.charCodeAt(position) === 32) {
        position++;
      }
    }

    nextspace = data.indexOf(' ', position);

    // If there's no more whitespace left, extract everything from the
    // current position to the end of the string as the command.
    if (nextspace === -1) {
      if (data.length > position) {
        message.command = data.slice(position);
        return message;
      }

      return null;
    }

    // Else, the command is the current position up to the next space. After
    // that, we expect some parameters.
    message.command = data.slice(position, nextspace);

    position = nextspace + 1;

    // Skip any trailing whitespace.
    while (data.charCodeAt(position) === 32) {
      position++;
    }

    while (position < data.length) {
      nextspace = data.indexOf(' ', position);

      // If the character is a colon, we've got a trailing parameter.
      // At this point, there are no extra params, so we push everything
      // from after the colon to the end of the string, to the params array
      // and break out of the loop.
      if (data.charCodeAt(position) === 58) {
        message.params.push(data.slice(position + 1));
        break;
      }

      // If we still have some whitespace...
      if (nextspace !== -1) {
        // Push whatever's between the current position and the next
        // space to the params array.
        message.params.push(data.slice(position, nextspace));
        position = nextspace + 1;

        // Skip any trailing whitespace and continue looping.
        while (data.charCodeAt(position) === 32) {
          position++;
        }

        continue;
      }

      // If we don't have any more whitespace and the param isn't trailing,
      // push everything remaining to the params array.
      if (nextspace === -1) {
        message.params.push(data.slice(position));
        break;
      }
    }

    return message;
  }

  /**
   * @param {string} str channel name
   * @returns {string}
   */
  static properChannel(str) {
    const channel = (str ? str : '').toLowerCase();
    return channel[0] === '#' ? channel : `#${channel}`;
  }

  /**
   * @param {string} str channel name
   * @returns {string}
   */
  static properUsername(str) {
    const username = (str ? str : '').toLowerCase();
    return username[0] === '#' ? username.slice(1) : username;
  }

  static union(k, f) {
    return [...new Set([...k, ...f])];
  }

  static wait(time) {
    return new Promise(resolve => setTimeout(resolve, time));
  }

  /**
   * if a message is of type action
   * @param {string} string message content
   * @returns {boolean}
   */
  static Action(string) {
    return string.match(/^\\u0001ACTION ([^\\u0001]+)\\u0001$/);
  }

  /**
   * send a message to twitch
   * @param {Client} client - inst of client class
   * @param {string} content - message its self
   * @param {string} channel - message channel name
   * @returns {Message | { error: any }}
   */
  static buildMessage(client, content, channel) {
    if (client.ws.socket == null || client.ws.socket.readyState !== 1) return;

    if (content.length >= 500) {
      const msg = this.splitLine(content, 500);
      content = msg[0];

      setTimeout(() => {
        this.buildMessage(client, msg[1], channel);
      }, 350);
    }

    client.ws.send(`PRIVMSG ${channel} :${content}`);
    client.ws.on(Events_Resolvers.MESSAGE_DUPLICATE_ERROR, error => {
      return {
        boolean: false,
        error,
      };
    });

    return new Message(
      client,
      {
        id: null,
        author: client.user,
        channel,
        content,
        type: 'chat',
      },
      true
    );
  }

  /**
   * send a whisper message for twitch
   * @param {Client} client - inst of client class
   * @param {string} content - message its self
   * @param {string} channel - message channel name
   * @returns {Message | { error: any }}
   */
  static buildWMessage(client, content, channel) {
    if (client.ws.socket == null || client.ws.socket.readyState !== 1) return { error: 'NOT_CONNECTED' };

    if (content.length >= 500) {
      const msg = this.splitLine(content, 500);
      content = msg[0];

      setTimeout(() => {
        this.buildWMessage(client, msg[1], channel);
      }, 350);
    }

    client.ws.send(`PRIVMSG ${channel} :${content}`);
    client.ws.on(Events_Resolvers.MESSAGE_DUPLICATE_ERROR, error => {
      return {
        boolean: false,
        error,
      };
    });

    return new Whisper(
      client,
      {
        id: null,
        author: client.user,
        channel,
        content,
        type: 'whisper',
      },
      {
        user_id: client.user ? client.user.id : undefined,
      },
      true
    );
  }

  /**
   * @param {string} str - split string
   * @param {number} len - max langth
   * @returns {string[]}
   */
  static splitLine(str, len) {
    let lastSpace = str.substring(0, len).lastIndexOf(' ');
    if (lastSpace === -1) lastSpace = len - 1;
    return [str.substring(0, lastSpace), str.substring(lastSpace + 1)];
  }

  /**
   * resolves badges form a string
   * @param {string} badgesString - string of badges
   * @returns {Object<any, number>}
   */
  static badgesResolver(badgesString) {
    const obj = {};
    const splitBadges = badgesString.split(',');
    for (const badge of splitBadges) {
      const resolved = badge.split('/');
      obj[resolved[0]] = parseInt(resolved[1]);
    }
    return obj;
  }
}

module.exports = Utils;
