var db = require('../config');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');

var User = db.Model.extend({
  tableName: 'users',
  hasTimestamp: true,
  initialize: function(params) {
    this.on('creating', function(model, attrs, options) {
      var passHash = bcrypt.hash(params.password, null, null, function(err, result) {
        if(err) { throw err; }
        console.log(result);
      });
    });
  }
});

module.exports = User;
