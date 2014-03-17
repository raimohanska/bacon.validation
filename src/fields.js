define(["lodash", "bacon", "./validations", "./conversions", "./validity", "./validationtype", "./validationcontroller", "bacon.jquery"], function(_, Bacon, validations, conversions, Validity, ValidationType, ValidationController, bjq) {
  return {
    validatedTextField: validatedTextField,
    validatedTextPasswordField: validatedTextPasswordField,
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

    var ajaxValidationPending = valueToBeValidatedWithAjax.awaiting(ajaxValidationResult)
    var ajaxOk = ajaxValidated.or(missing).or(validationCondition.not())
    var ajaxValidation = ajaxOk.map(function (isValid) { return Validity.check(isValid, ValidationType.error) })

    validationController.addValidation(ajaxValidation)
    validationController.addValidation(ajaxOk.map(function (isValid) { return Validity.check(isValid, ValidationType.error) }))
    ajaxOk.not().assign(inputField, "toggleClass", "error")
    ajaxValidationPending.assign(inputField, "toggleClass", "ajax-pending")
  }

  function validatedTextField(inputField, options) {
    return validatedTextFieldWithValidators(inputField, options, [validations.latin1, validations.illegalCharacters])
  }
  function validatedTextPasswordField(inputField, options) {
    return validatedTextFieldWithValidators(inputField, options, [validations.latin1])
  }
  function validatedTextFieldWithValidators(inputField, options, validators) {
    options = options || {}

    _.defaults(options, {
      validationController: ValidationController(),
      validators: [],
      validateWhen: Bacon.constant(true),
      disableWhen: Bacon.constant(false),
      hideWhen: Bacon.constant(false),
      converter: conversions.trim,
      ajaxValidationUrl: null
    })

    options.validators = options.validators.concat(validators)

    var validatorsP = Bacon.combineTemplate({
      v1: options.validators,
      v2: validators
    }).map(function(v) {
        return v.v1.concat(v.v2)
      }).skipDuplicates(_.isEqual)

    var value = bjq.textFieldValue(inputField, options.initValue)
      .lens({
        get: options.converter,
        set: function(context, value) { return value }
      })
    value.syncConverter = function(value) { return value || "" }
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
