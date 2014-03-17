define(["./validationtype"], function(ValidationType) {
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