require.config({
  paths: {
    "jquery": "lib/jquery/jquery.min",
    "lodash": "../node_modules/lodash/dist/lodash",
    "bacon": "../node_modules/baconjs/dist/Bacon",
    "bacon.model": "../node_modules/bacon.model/dist/bacon.model",
    "bacon.jquery": "../node_modules/bacon.jquery/dist/bacon.jquery",
    "bacon.validation": "../dist/bacon.validation"
  }
})
require(["bacon", "bacon.validation"], function(Bacon, Validation) {
  var expect = chai.expect
  describe('Validation', function() {
    describe('Fields.validatedSelect', function() {
      it("validates", function() {
        var validator = Validation.Validations.lengthBetween(3,3)
        specifyValidity(validator, "aaa", [])
        specifyValidity(validator, "b", ["error"])
      })

      function specifyValidity(validator, value, errors) {
        withSelect(function(field) {
          var model = Validation.Fields.validatedSelect(field, { initValue: "a", validators: [validator] })
          model.set(value)
          specifyErrors(field, errors)
        })
      }

      function withSelect(f) {
        $('#bacon-dom').html('<select id="select"><option value="aaa">A</option><option value="b">B</option></select>')
        var field = $('#bacon-dom #select')
        f(field)
      }
    })

    describe('Fields.validatedTextField', function() {
      describe('validation', function() {
        it("adds 'missing' class for missing, required field", function() {
            withTextField(function(field) {
              var model = Validation.Fields.validatedTextField(field, { initValue: "", validators: [Validation.Validations.required] })
              specifyErrors(field, ["missing"])
            })
        })
        it("adds 'error' class for erroneous field", function() {
          withTextField(function(field) {
            var model = Validation.Fields.validatedTextField(field, { initValue: "too long", validators: [Validation.Validations.lengthBetween(1,2)] })
            specifyErrors(field, ["error"])
          })
        })
        it("ValidationController.allValid works", function() {
          withTextField(function(field) {
            var ctrl = Validation.ValidationController()
            var model = Validation.Fields.validatedTextField(field, { validationController: ctrl, initValue: "too long", validators: [Validation.Validations.lengthBetween(1,2)] })
            expectStreamValues(ctrl.allValid(), [false])
          })
        })
      })

      describe("validators", function() {
        it("regex", function() {
          var validator = Validation.Validations.regex(".*hello.*")
          specifyValidity(validator, "xhellox", [])
          specifyValidity(validator, "ello", ["error"])
        })
      })

      function specifyValidity(validator, value, errors) {
        withTextField(function(field) {
          var model = Validation.Fields.validatedTextField(field, { initValue: "", validators: [validator] })
          model.set(value)
          specifyErrors(field, errors)
        })
      }

      function withTextField(f) {
        f(createField())
      }

      function createField() {
        $('#bacon-dom').html('<input type="text" id="text">')
        return $('#bacon-dom #text')
      }
    })

    function specifyErrors(field, classes) {
      expect(_.intersection(["error", "missing", "duplicate"], field.attr("class").split(" "))).to.deep.equal(classes)
    }
  })

  function expectStreamValues(stream, expectedValues) {
    var values = []
    before(function(done) {
      stream.onValue(function(value) { values.push(value) })
      stream.onEnd(done)
    })
    it("is an EventStream", function() {
      expect(stream instanceof Bacon.EventStream).to.be.ok()
    })
    it("contains expected values", function() {
      expect(values).to.deep.equal(expectedValues)
    })
  }

  function testEventHelper(eventName) {
    var methodName = eventName + "E"
    describe(methodName, function() {
      it("captures DOM events as EventStream", function() {
        $('#bacon-dom').html('<input type="text" id="text">')
        var el = $('#bacon-dom #text')
        var stream = el[methodName]()
        var values = collectValues(stream)
        el[eventName]()
        expect(values.length).to.equal(1)
      })
    })
  }

  function specifyValue(obs, expected) {
    var gotIt = false
    var value
    obs.onValue(function(v) {
      gotIt = true
      value = v
    })
    expect(gotIt).to.equal(true)
    expect(value).to.deep.equal(expected)
  }

  function collectValues(observable) {
    var values = [];
    observable.onValue(function(value) {
      return values.push(value);
    });
    return values;
  }

  if (window.mochaPhantomJS) { 
    mochaPhantomJS.run(); 
  } else {
    mocha.run(); 
  }
})
