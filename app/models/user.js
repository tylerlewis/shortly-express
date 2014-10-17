var db = require('../config');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');

var User = db.Model.extend({
  tableName: 'users',
  hasTimestamp: true,
  initialize: function() {
    this.on('creating', this.hashPassword, this);
  },
  hashPassword: function() {
    return Promise.promisify(bcrypt.hash)(this.get('password'), null, null).bind(this).then(function(hash) {
      this.set('password', hash)
    });
  }
});

module.exports = User;

