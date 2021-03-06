﻿// ConvertSvc.js
// Provide functionality to convert a text math expression, such as 3 + ln(5 + 2*i) to the appropriate
// asm.js code. Think of it as a transpiler that converts conventional mathematical notation to asm.js
// code.
// jslint directive
/*jslint browser: true, white: true, for: true*/

var ConvertSvc = [function () {
    'use strict';
    var that = this,
        // Note that these operators are sorted by precedence from lowest to highest.
        OPERATORS = ['-', '+', '/', '*', '^'],
        // These match the names of the functions to compute the operators in ComputationModule.js.
        OPERATOR_NAMES = ['subtract', 'add', 'divide', 'multiply', 'computePower'],
        // When compute_ is prepended to these names, it matches the names of the functions to compute them
        // in ComputationModule.js.
        ONE_ARG_FUNCTIONS = ['real', 'imag', 'abs', 'arg', 'sin', 'cos', 'sh', 'ch', 'exp', 'ln', 'conj'];

    // Parse the input into a sort of tree.
    // Represent the input as an array.  The first element of the array is an operator or function.
    // If the first element is an operator, it is followed by two arguments, which may themselves contain
    // more mathematics.  If it is a function, it is followed by one argument.    
    // For example, "1+2" -> ["+", "1", "2"]
    // 1 + cos(0) -> ["+", 1, ["cos", "0"]]    
    // This function operates recursively.    
    function parseTextToMathArray(text) {
        debugger;
        function recurse(text) {
            var i, index, operand0, operand1;

            // Search for the substring within the given text without going inside parenthesis.
            // Return the index of the first letter of the first instance of the substring or -1 if it
            // isn't found.  This is used to search for operators, function names, and parenthesis.
            function findIndex(toFind, text) {
                var j, c, numParens = 0;
                // numParents keeps track of how deep inside parenthesis we are nested; we only want to
                // match outside the parenthesis.
                for (j = 0; j < text.length; j += 1) {
                    c = text.substr(j, toFind.length);
                    // The first part of the expression checks for a match.
                    // The second part of the expression checks that we're not looking for subtraction and
                    // finding a unary '-' instead.
                    if (c === toFind && numParens === 0 &&
                        !(toFind === '-' && (j === 0 || OPERATORS.indexOf(text[j - 1]) > -1))) {
                        return j;
                    }
                    if (c.substr(0, 1) === '(') {
                        numParens += 1;
                    } else if (c.substr(0, 1) === ')') {
                        numParens -= 1;
                    }
                }
                return -1;
            } // end function findIndex

            // Search for each of our -+/*^ operators.
            // They are sorted by precedence from lowest to highest.
            for (i = 0; i < OPERATORS.length; i += 1) {                
                index = findIndex(OPERATORS[i], text);
                if (index > -1) {
                    operand0 = text.substr(0, index);
                    operand1 = text.substr(index + 1);
                    return [OPERATORS[i], recurse(operand0), recurse(operand1)];
                }
            }            
            // If we didn't find any of the operators, look for the one argument functions
            for (i = 0; i < ONE_ARG_FUNCTIONS.length; i += 1) {
                index = findIndex(ONE_ARG_FUNCTIONS[i], text);
                if (index > -1) {
                    operand0 = text.substr(index + ONE_ARG_FUNCTIONS[i].length,
                        text.length - ONE_ARG_FUNCTIONS[i].length - index * 2);
                    return [ONE_ARG_FUNCTIONS[i], recurse(operand0)];
                }
            }
            // If we've made it this far, there isn't a single operation we can perform without going
            // inside parenthesis.  If there are parenthesis, recurse on what's inside the parenthesis.
            index = findIndex('(', text);
            if (index === 0) {
                return recurse(text.substr(1, text.length - 2));
            }
            // If we've made it this far, this is a primitive expression, so return it without any further processing; recursion ends here.
            return text;
        } // end function recurse        

        // Remove spaces, replace long dash with short one, and convert to lower case.  This happens only
        // once before recursion begins.
        text = text.replace(/ /g, '');        
        text = text.replace(/−/g, '-');
        text = text.toLowerCase();
                        
        return recurse(text);
    } // end function parseTextToMathArray

    // Parse a tree-like structure representing a mathematical expression and output asm.js code.    
    // This function operates recursively.
    function convertMathArrayToAsmjs(mathArray) {
        var i, numVariables,variableDeclarations, computationCode, asmjsCode;

        function recurse(input) {
            // Note that the result variable acts as a sort of string builder to avoid excessive string
            // concatenations.
            var firstVariableNum, secondVariableNum, result = [];
            
            // TODO: check for a literal with i
            if (typeof input === 'string') {
                // If we have a string instead of an array, this should be a number.                
                if (!isNaN(input)) {
                    result.push('outR = +' + input + ';\noutI = +0;\n');
                } else if (input === 'i') {
                    result.push('outR = 0.0;\noutI = 1.0;\n');
                } else if (input === '-i') {
                    result.push('outR = 0.0;\noutI = -1.0;\n');
                }
            } else if (OPERATORS.indexOf(input[0]) > -1) {
                // In this case, the first element of input is an operator and it should be followed by two
                // operands.  This will emit asm.js code to save the two operands into variables
                // that are then passed into the appropriate function to compute the result of the operator.
                // We recurse on the two operands until we find that they are numeric values.
                firstVariableNum = numVariables;
                numVariables += 1;                
                result.push(recurse(input[1]));
                result.push('__r' + firstVariableNum + ' = +outR;\n');
                result.push('__i' + firstVariableNum + ' = +outI;\n');

                secondVariableNum = numVariables;
                numVariables += 1;
                result.push(recurse(input[2]));
                result.push('__r' + secondVariableNum + ' = +outR;\n');
                result.push('__i' + secondVariableNum + ' = +outI;\n');

                for (i = 0; i < OPERATORS.length; i += 1) {
                    if (input[0] === OPERATORS[i]) {
                        result.push(OPERATOR_NAMES[i] +
                            '(__r' + firstVariableNum + ', __i' + firstVariableNum + ', __r' +
                            secondVariableNum + ', __i' + secondVariableNum + ');\n');
                        break;
                    }
                }                
            } else if (ONE_ARG_FUNCTIONS.indexOf(input[0]) > -1) {
                // In this case, the first element of the input is a function and it should be followed by
                // one argument.  This works just like the above case with an operator, except the function
                // invokation emitted only has one argument.
                firstVariableNum = numVariables;
                numVariables += 1;
                result.push(recurse(input[1]));
                result.push('__r' + firstVariableNum + ' = outR;\n');
                result.push('__i' + firstVariableNum + ' = outI;\n');

                // This assumes that the function to compute this in asm.js is named 'compute_' followed by
                // the name of the function.
                result.push('compute_' + input[0] +
                    '(__r' + firstVariableNum + ', __i' + firstVariableNum + ');\n');
            }

            return result.join('');
        }

        // numVariables will be incremented to the actual number of variables to declare when recurse
        // is called.  It is used to keep track of how many variables we need to declare to hold the
        // assignments that will be emitted by the recurse function.
        numVariables = 0;        
        computationCode = recurse(mathArray);

        // Declare all the the asm.js variables as doubles.
        variableDeclarations = [];
        for (i = 0; i < numVariables; i += 1) {
            variableDeclarations.push('var __r' + i + ' = 0.0;\n');
            variableDeclarations.push('var __i' + i + ' = 0.0;\n');
        }
        variableDeclarations = variableDeclarations.join('');

        asmjsCode = variableDeclarations + computationCode;        
        return asmjsCode;
    }

    // Convert a textual mathematics expression to asm.js code.
    // This is the only function that is exposed to the calling code.
    function convert(text) {
        var mathArray = parseTextToMathArray(text),
            asmjsCode = convertMathArrayToAsmjs(mathArray);        
        return asmjsCode;
    }

    that.convert = convert;
}];

// TODO: Throw errors for invalid input.