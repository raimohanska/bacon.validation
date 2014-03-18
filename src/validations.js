define(["lodash", "./validity"], function (_, Validity) {
  var Validations = {
    exists:function(value) {
      return value != null ? Validity.ok : Validity.missing
    },
    // required :: Validation
    required:function(value) {
      return (value.length > 0) ? Validity.ok : Validity.missing
    },
    requiredWithError:function(value) {
      return (value.length > 0) ? Validity.ok : Validity.error
    },
    // email :: Validation
    email:emptyOk(function(value) {
      var validEmail = /^([A-Za-z0-9\x27\x2f!#$%&*+=?^_`{|}~-]+(\.[A-Za-z0-9\x27\x2f!#$%&*+=?^_`{|}~-]+)*)@(([a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]|[a-zA-Z0-9]{1,63})(\.([a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]|[a-zA-Z0-9]{1,63}))*\.[a-zA-Z0-9]{2,63})$/
      var localPart = value.substring(0, value.indexOf('@'))
      return Validity.check((localPart.length <= 64 && validEmail.test(value)), 'error')
    }),
    // lengthBetween :: Number -> Number -> Validation
    lengthBetween:function(min, max) {
      return emptyOk(function(value) {
        return Validity.check((value.length >= min && value.length <= max), 'error')
      })
    },
    latin1:function(value) {
      for (var i = 0; i < value.length; i++) {
        if (value.charCodeAt(i) >= 256) return Validity.error
      }
      return Validity.ok
    },
    illegalCharacters:function(value) {
      var illegalChars = "<>%#\\;";
      for (var i = 0; i < illegalChars.length; i++) {
        if(_.contains(value, illegalChars[i])) {
          return Validity.error
        }
      }
      return Validity.ok
    },
    regex: function(regex) {
      if (!(regex instanceof RegExp)) regex = new RegExp(regex)
      return function(value) {
        return Validity.check(regex.test(value), 'error')
      }
    },
    anythingGoes: function(value) {
      return Validity.ok
    },
    validateWhenExists: function(condition, validator) {
      return condition.map(function(shouldValidate) {
        if (shouldValidate) {
          return validator
        } else {
          return Validations.anythingGoes
        }
      })
    }
  }

  return Validations

  function match(x, pattern) {
    return x.match(pattern) != undefined
  }
  function emptyOk(fn) {
    return function(value) {
      if(value.trim().length === 0) return Validity.ok
      return fn(value)
    }
  }
})

