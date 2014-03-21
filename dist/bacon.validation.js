define('conversions',[], function() {
  var conversions = function() {
    return {
      trim: function(value) {
        return value.trim()
      }
    }
  }()
  return conversions
})
;
define('validationtype',[], function () {
  var ValidationType  = {
    missing: "missing",
    error: "error",
    duplicate: "duplicate"
  }
  return ValidationType
});
define('validity',["lodash", "./validationtype"], function(_, ValidationType) {
  function Validity(errors) {
    if (!(errors instanceof Array)) throw "Not array: " + errors
    return {
      isValid: errors.length == 0,
      errors: errors,
      isMissing: _.contains(errors, ValidationType.missing),
      containsError: function(validationType) {
        return _.contains(errors, validationType)
      },
      combine: function(other) {
        return Validity(this.errors.concat(other.errors))
      }
    }
  }
  // Validity.ok :: Validity
  Validity.ok = Validity([])
  Validity.missing = Validity([ValidationType.missing])
  Validity.duplicate = Validity([ValidationType.duplicate])
  Validity.error = Validity([ValidationType.error])
  Validity.check = function(condition, validationType) { return condition ? Validity.ok : Validity([validationType]) }

  // Validity.conditional :: Property<Validity> -> Property<boolean> -> Property<Validity>
  Validity.conditional = function(validity, condition) {
    return validity.combine(condition, function(validity, condition) {
      if (!condition) return Validity.ok
      return validity
    })
  }

  return Validity
})
;
define('validations',["lodash", "./validity"], function (_, Validity) {
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
    },
    emptyOk: emptyOk
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

;
define('validationcontroller',["lodash", "./validity"], function (_, Validity) {
  // parent :: Option<ValidationController>
  return function ValidationController(parent) {
    var validations = []
    function allTrue(validationResults) {
      return _(validationResults).pluck('isValid').all().valueOf()
    }
    function anyFalse(validationResults) {
      return !allTrue(validationResults)
    }

    function combinedValidation() {
      return Bacon.combineAsArray(_.pluck(validations, "valid")).startWith(Validity.missing);
    }

    return {
      // addValidation :: Property<Validity> -> void
      addValidation: function(validity) {
        validations.push({
          valid: validity,
          missing: validity.map(".isMissing")
        })
        if (parent) parent.addValidation(validity)
      },
      // allValid :: Property<boolean>
      allValid: function() {
        return combinedValidation().map(allTrue).skipDuplicates()
      },
      anyInvalid: function() {
        return combinedValidation().map(anyFalse).skipDuplicates()
      }
    }
  }
})
;
define('fields',["lodash", "bacon", "./validations", "./conversions", "./validity", "./validationtype", "./validationcontroller", "bacon.jquery"], function(_, Bacon, validations, conversions, Validity, ValidationType, ValidationController, bjq) {
  return {
    validatedTextField: validatedTextField,
    validatedSelect: validatedSelect,
    requiredCheckbox: requiredCheckbox
  }

  function ajaxValidation(inputField, ajaxValidationUrl, valueProperty, validity, validationCondition, validationController) {
    var missing = valueProperty.map(function (value) { return !validations.required(value).isValid })
    var valid = validity.map(function(validity) { return validity.isValid }).and(missing.not())
    var valueToBeValidatedWithAjax = valueProperty.filter(valid)
    var ajaxValidationResult = valueToBeValidatedWithAjax
      .debounce(1000)
      .map(function (value) { return {url: ajaxValidationUrl.replace(/\{val\}/g, value)}})
      .flatMapLatest(bjq.ajax)

    var ajaxValidated = ajaxValidationResult.mapError(false).startWith(false).merge(valueProperty.changes().map(false)).toProperty().skipDuplicates()

    var ajaxValidationPending = valueToBeValidatedWithAjax.awaiting(ajaxValidationResult.mapError())
    var ajaxOk = ajaxValidated.or(missing).or(validationCondition.not())
    var ajaxValidation = ajaxOk.map(function (isValid) { return Validity.check(isValid, ValidationType.error) })

    validationController.addValidation(ajaxValidation)
    validationController.addValidation(ajaxOk.map(function (isValid) { return Validity.check(isValid, ValidationType.error) }))
    ajaxOk.not().assign(inputField, "toggleClass", "error")
    ajaxValidationPending.assign(inputField, "toggleClass", "ajax-pending")
  }

  function withDefaults(options) {
    options = options || {}

    return _.defaults(options, {
      validationController: ValidationController(),
      validators: [],
      validateWhen: Bacon.constant(true),
      disableWhen: Bacon.constant(false),
      hideWhen: Bacon.constant(false),
      converter: conversions.trim,
      ajaxValidationUrl: null
    })
  }

  function validatedTextField(inputField, options) {
    options = withDefaults(options)
    var value = bjq.textFieldValue(inputField, options.initValue)
    return validatedField(inputField, value, options)
  }

  function validatedSelect(selectField, options) {
    options = withDefaults(options)
    var value = bjq.selectValue(selectField, options.initValue)
    return validatedField(selectField, value, options)
  }

  function validatedField(inputField, value, options) {
    value = value.lens({
      get: options.converter,
      set: function(context, value) { return value }
    })
    var validatorsP = Bacon.combineTemplate(options.validators).skipDuplicates(_.isEqual)

    var fieldIsRequired = _.contains(options.validators, validations.required)
    if (fieldIsRequired) {
      inputField.addClass('required')
    }

    var validity = value.combine(validatorsP, function(value, validators) {
      var validity = Validity.ok
      _.each(validators, function (validator) {
        validity = validity.combine(validator(value))
      })
      return validity
    })

    validity = Validity.conditional(validity, options.validateWhen)

    fieldSideEffects(inputField, validity)

    options.validationController.addValidation(validity)

    options.disableWhen.assign(inputField, "prop", "disabled")
    options.hideWhen.not().assign(inputField, "toggle")

    if (options.ajaxValidationUrl) {
      ajaxValidation(inputField, options.ajaxValidationUrl, value, validity, options.validateWhen, options.validationController)
    }
    return value
  }

  function requiredCheckbox(checkBoxElement, initValue, validationController) {
    var checkBoxProperty = bjq.checkBoxValue(checkBoxElement, initValue)
    var isValid = checkBoxProperty.map(function(value) {
      return Validity.check(value, ValidationType.missing)
    })
    validationController.addValidation(isValid)
    fieldSideEffects(checkBoxElement, isValid)
    return checkBoxProperty
  }

  function fieldSideEffects(inputField, validity) {
    validity.onValue(function(validity) {
      _.each(ValidationType, function(validationType) {
        inputField.toggleClass(validationType, validity.containsError(validationType))
      })
    })
  }
})
;
define('bacon.validation',['require','./conversions','./fields','./validationcontroller','./validations','./validationtype','./validity'],function(require) {
  return {
    Conversions: require("./conversions"),
    Fields: require("./fields"),
    ValidationController: require("./validationcontroller"),
    Validations: require("./validations"),
    ValidationType: require("./validationtype"),
    Validity: require("./validity")
  }
});
