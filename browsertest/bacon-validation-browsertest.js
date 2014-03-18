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
    describe('Fields.validatedTextField', function() {
      var field
      beforeEach(function() {
        $('#bacon-dom').html('<input type="text" id="text">')
        field = $('#bacon-dom #text')
      })

      describe('validation', function() {
        it("adds 'missing' class for missing, required field", function() {
            var model = Validation.Fields.validatedTextField(field, { initValue: "", validators: [Validation.Validations.required] })
            expect(field.hasClass("missing")).to.equal(true)
        })
        it("adds 'error' class for erroneous field", function() {
            var model = Validation.Fields.validatedTextField(field, { initValue: "too long", validators: [Validation.Validations.lengthBetween(1,2)] })
            expect(field.hasClass("error")).to.equal(true)
        })
      })

      describe('text field behavior', function() {
        describe('with initVal', function() {
          it('sets value to DOM', function() {
              var model = Validation.Fields.validatedTextField(field, { initValue: 'initVal' })
              expect(field.val()).to.equal('initVal')
          })
          it('sets the initVal as the initial value of the model', function() {
            var model = Validation.Fields.validatedTextField(field, { initValue: 'initVal' })
            specifyValue(model, 'initVal')
          })
        })

        describe('when setting value of model', function() {
          it('sets value to DOM', function() {
              Validation.Fields.validatedTextField(field).set('newVal')
              expect(field.val()).to.equal('newVal')
          })
        })

        describe('when DOM value changes', function() {
          it('updates value of model', function() {
            var model = Validation.Fields.validatedTextField(field)
            field.val("newVal")
            field.trigger("keyup")
            specifyValue(model, "newVal")
          })
        })
      })
    })
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
