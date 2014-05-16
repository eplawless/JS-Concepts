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

function Spy(functionBody) {

    functionBody = functionBody || function() {};

    var context = {
        arrCalls: [],
        arrConditionalActions: [],
        functionBody: functionBody,
        returnValue: undefined
    };

    var result = function spy() {
        context.arrCalls.push({
            this: this,
            arguments: arguments
        });
        var functionBodyResult = context.functionBody();
        var returnValue = typeof context.returnValue !== 'undefined' ? context.returnValue : functionBodyResult;
        for (var idx = 0; idx < context.arrConditionalActions.length; ++idx) {
            var action = context.arrConditionalActions[idx];
            if (action.condition(this, arguments)) {
                switch (action.type) {
                    case 'returnValue': returnValue = action.returnValue;
                        break;
                    case 'executeFunction': action.func();
                        break;
                }
            }
        }
        return returnValue;
    };

    result._context = context;
    var prototype = result.__proto__ = Object.create(result.__proto__);
    for (var key in this.__proto__) {
        prototype[key] = this.__proto__[key];
    }
    return result;

}

Spy.prototype = {

    wasCalledWith: function wasCalledWith() {

        var arrCalls = this._context.arrCalls;
        if (arrCalls.length === 0)
            return false;
        var arrExpectedArguments = Array.prototype.slice.call(arguments, 0);
        for (var idxCall = 0; idxCall < arrCalls.length; ++idxCall) {
            var call = arrCalls[idxCall];
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

    whenCalledWith: function whenCalledWith() {
        var self = this;
        var arrExpectedArguments = Array.prototype.slice.call(arguments, 0);
        var conditionalAction = {
            type: undefined, // TBD by returnValue call
            returnValue: undefined, // ditto
            condition: function wasCalledWithExpectedArguments(self, arrArguments) {
                if (arrExpectedArguments.length > arrArguments.length)
                    return false;
                for (var idx = 0; idx < arrExpectedArguments.length; ++idx) {
                    if (arrExpectedArguments[idx] !== arrArguments[idx])
                        return false;
                }
                return true;
            }
        };
        return {
            executeFunction: function(func) {
                conditionalAction.type = 'executeFunction';
                conditionalAction.func = func;
                self._context.arrConditionalActions.push(conditionalAction);
                return self;
            },
            returnValue: function(value) {
                conditionalAction.type = 'returnValue';
                conditionalAction.returnValue = value;
                self._context.arrConditionalActions.push(conditionalAction);
                return self;
            }
        };
    },

    whenCalled: function whenCalled() {
        var self = this;
        return {
            returnValue: function returnValue(value) {
                self._context.returnValue = value;
            },
            executeFunction: function executeFunction(func) {
                self._context.arrConditionalActions.push({
                    type: 'executeFunction',
                    func: func,
                    condition: function() { return true; }
                });
                return self;
            },
        };
    },

    setFunctionBody: function setFunctionBody(func) {
        this._context.functionBody = func;
    },


    returnValue: function returnValue(value) {
        this._context.returnValue = value;
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
            if (typeof this.defaultValue === 'function') {
                return new Spy(this.defaultValue);
            } else {
                return this.defaultValue;
            }
        }
        switch (this._arrTypes[0]) {
            case this.NoType:       return null;
            case this.IntegerType:  return 0;
            case this.NumberType:   return 0;
            case this.StringType:   return '';
            case this.FunctionType: return new Spy;
            case this.ArrayType:    return [];
            case this.ObjectType:   return {};
            case this.RegexType:    return new RegExp;
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
    .addMethod('bark').withDefaultMockValue(function() { console.log('woof!') })
    .build();

var dumbConcept = new ConceptBuilder()
    .addInteger('test').makeOptional()
    .build();

var conceptMock = conceptConcept.mock();
conceptMock.mock.whenCalled().returnValue({ hello: 'world' })
conceptMock.mock.whenCalledWith('test').returnValue({ what: 'the fuck' });
conceptMock.mock.whenCalledWith('test').executeFunction(function() { console.log('wat') });
conceptMock.isImplementedBy.returnValue(false)
conceptMock.isImplementedBy.whenCalled().executeFunction(function() { console.log('ahahaha') })
conceptMock.isImplementedBy.whenCalledWith('omg').returnValue(true)

console.log(conceptMock.mock());
console.log(conceptMock.mock('test'));
console.log(conceptMock.mock.wasCalledWith('test'))
console.log(conceptMock.isImplementedBy('anything else'))
console.log(conceptMock.isImplementedBy('omg'))

var dogMock = dogConcept.mock();
dogMock.bark.whenCalled().executeFunction(function() { console.log('woof!') })
dogMock.bark.returnValue('wof')
console.log(dogMock.bark())

var dogMock2 = dogConcept.mock();
console.log(dogMock2.bark());
