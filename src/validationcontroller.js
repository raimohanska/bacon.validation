define(["lodash", "./validity"], function (_, Validity) {
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
