function ConceptBuilder() {
    this._arrFieldConfigs = [];
    this._latestFieldConfig = null;
}

ConceptBuilder.prototype = {

    NoType:       {},
    IntegerType:  {},
    NumberType:   {},
    StringType:   {},
    FunctionType: {},
    ArrayType:    {},
    ObjectType:   {},
    RegexType:    {},
    ConceptType:  {},

    addProperty: function addProperty(name, typeOrTypes, data) {
        var fieldConfig = { name: name, typeOrTypes: typeOrTypes, data: data };
        this._arrFieldConfigs.push(fieldConfig);
        this._latestFieldConfig = fieldConfig;
        return this;
    },

    addInteger: function addInteger(name) { return this.addProperty(name, this.IntegerType); },
    addNumber: function addNumber(name) { return this.addProperty(name, this.NumberType); },
    addString: function addString(name) { return this.addProperty(name, this.StringType); },
    addMethod: function addMethod(name) { return this.addProperty(name, this.FunctionType); },
    addArray: function addArray(name) { return this.addProperty(name, this.ArrayType); },
    addObject: function addObject(name) { return this.addProperty(name, this.ObjectType); },
    addRegex: function addRegex(name) { return this.addProperty(name, this.RegexType); },
    addConcept: function addConcept(name, concept) { return this.addProperty(name, this.ConceptType, concept) },

    makeOptional: function makeOptional() {
        this._latestFieldConfig.isOptional = true;
        return this;
    },

    withDefaultMockValue: function withDefaultMockValue(value) {
        this._latestFieldConfig.defaultValue = value;
        return this;
    },

    build: function build() {
        return new ObjectConcept(this._arrFieldConfigs);
    }

};

function Spy() {

    var arrCalls = [];
    var result = function() {
        arrCalls.push({
            this: this,
            arguments: arguments
        });
    };
    result._arrCalls = arrCalls;
    var prototype = result.__proto__ = Object.create(result.__proto__);
    for (var key in this.__proto__) {
        prototype[key] = this.__proto__[key];
    }
    return result;

}

Spy.prototype = {

    calledWith: function calledWith() {

        if (this._arrCalls.length === 0)
            return false;
        var arrExpectedArguments = Array.prototype.slice.call(arguments, 0);
        for (var idxCall = 0; idxCall < this._arrCalls.length; ++idxCall) {
            var call = this._arrCalls[idxCall];
            if (call.arguments.length < arrExpectedArguments.length)
                continue;
            var failedMatch = false;
            for (var idxArgument = 0; idxArgument < arrExpectedArguments.length; ++idxArgument) {
                var providedArgument = call.arguments[idxArgument]
                var expectedArgument = arrExpectedArguments[idxArgument];
                if (expectedArgument !== providedArgument) {
                    failedMatch = true;
                    break;
                }
            }
            if (!failedMatch)
                return true;
        }
        return false;

    },

};

function Field(fieldConfig) {

    this.name = fieldConfig.name;
    if (Array.isArray(fieldConfig.typeOrTypes)) {
        this._arrTypes = fieldConfig.typeOrTypes.slice(0);
    } else {
        this._arrTypes = [fieldConfig.typeOrTypes];
    }
    this.data = fieldConfig.data;
    this.isOptional = Boolean(fieldConfig.isOptional);

    if (fieldConfig.hasOwnProperty('defaultValue')) {
        this.defaultValue = fieldConfig.defaultValue;
    }

}

Field.prototype = {

    NoType:       ConceptBuilder.prototype.NoType,
    IntegerType:  ConceptBuilder.prototype.IntegerType,
    NumberType:   ConceptBuilder.prototype.NumberType,
    StringType:   ConceptBuilder.prototype.StringType,
    FunctionType: ConceptBuilder.prototype.FunctionType,
    ArrayType:    ConceptBuilder.prototype.ArrayType,
    ObjectType:   ConceptBuilder.prototype.ObjectType,
    RegexType:    ConceptBuilder.prototype.RegexType,
    ConceptType:  ConceptBuilder.prototype.ConceptType,

    mock: function mock() {
        if (this.hasOwnProperty('defaultValue')) {
            return this.defaultValue;
        }
        switch (this._arrTypes[0]) {
            case this.NoType:       return null;
            case this.IntegerType:  return 1234;
            case this.NumberType:   return 1.234;
            case this.StringType:   return 'mockstring';
            case this.FunctionType: return new Spy;
            case this.ArrayType:    return [];
            case this.ObjectType:   return {};
            case this.RegexType:    return /./;
            case this.ConceptType:  return this.data.mock();
            default:                return undefined;
        }
    },

    isImplementedBy: function isImplementedBy(value) {
        var skip = this.isOptional;
        for (var idx = 0; idx < this._arrTypes.length; ++idx) {
            var type = this._arrTypes[idx];
            switch (type) {
                case this.NoType:       return true;
                case this.IntegerType:  return skip ? true : typeof value === 'number' && ~~value === value;
                case this.NumberType:   return skip ? true : typeof value === 'number';
                case this.StringType:   return skip ? true : typeof value === 'string';
                case this.FunctionType: return skip ? true : typeof value === 'function';
                case this.ArrayType:    return skip ? true : Array.isArray(value);
                case this.ObjectType:   return skip ? true : value && typeof value === 'object';
                case this.RegexType:    return skip ? true : value instanceof regexp;
                case this.ConceptType:  return skip ? true : this.data.isImplementedBy(value);
            }
        }
        return false;
    }

};

function ObjectConcept(arrFieldConfigs) {

    this._arrFields = arrFieldConfigs.reduce(function(arrFields, fieldConfig) {
        arrFields.push(new Field(fieldConfig));
        return arrFields;
    }, []);

}

ObjectConcept.prototype = {

    mock: function mock() {
        var result = {};
        for (var idx = 0; idx < this._arrFields.length; ++idx) {
            var field = this._arrFields[idx];
            result[field.name] = field.mock();
        }
        return result;
    },

    isImplementedBy: function isImplementedBy(value) {
        if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
        for (var idx = 0; idx < this._arrFields.length; ++idx) {
            var field = this._arrFields[idx];
            if (! field.isImplementedBy(value[field.name])) return false;
        }
        return true;
    },

};

// TESTS

var conceptConcept = new ConceptBuilder()
    .addMethod('mock')
    .addMethod('isImplementedBy')
    .build();

var faceConcept = new ConceptBuilder()
    .addInteger('numEyes').withDefaultMockValue(2)
    .addNumber('numEars').withDefaultMockValue(1.5)
    .build();

var dogConcept = new ConceptBuilder()
    .addInteger('age').withDefaultMockValue(0)
    .addString('name').withDefaultMockValue('Spot')
    .addConcept('face', faceConcept)
    .build();

var dumbConcept = new ConceptBuilder()
    .addInteger('test').makeOptional()
    .build();

var conceptMock = conceptConcept.mock();
conceptMock.mock('test');
console.log(conceptMock.mock.calledWith('test'))
console.log(conceptMock)
