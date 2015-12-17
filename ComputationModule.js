// ComputationModule.js
// This code is not read with a script tag.  Instead, it is imported with an AJAX call and then the string
// DO_COMPUTATION is replaced with the code for a doComputation function.  eval() is then used to compute
// the programming that actually runs.  This is because asm.js does not allow for its programming to be
// modified at run-time.
// The use of eval would probably give Douglas Crockford heart palpitations :-)
// Note that the functions that implement the operators, trig functions, logarithms, etc
// return no value, but rather save the real part in the outR and the imaginary part in the outI variables.
// When the computation is all done, use get_outR and get_outI to get the results.

function getComputationModule() {
    var computationModule = (function foo1(stdlib, foreign, heap) {
        "use asm";
        var sqrt = stdlib.Math.sqrt,
            sin = stdlib.Math.sin,
            cos = stdlib.Math.cos,
            atan = stdlib.Math.atan,
            atan2 = stdlib.Math.atan2,
            exp = stdlib.Math.exp,
            ln = stdlib.Math.log,
            floor = stdlib.Math.floor,
            ceil = stdlib.Math.ceil,
            int32Array = new stdlib.Int32Array(heap),
            float64Array = new stdlib.Float64Array(heap),
            outR = 0.0,
            outI = 0.0;
                        
        "DO_COMPUTATION"        

        // Truncates the decimal part of a real number.
        function truncateDecimal(r) {
            r = +r;

            if (+r > 0.0)
                return +floor(r);
            else
                return +ceil(r);
            return 0.0;
        }

        // Compute the result of [r,i] raised to the power with the given real and imaginary parts..
        // Places the resulting real part in outR and the imaginary part in outI.
        function computePower(r, i, expr, expi) {
            // Tell asm.js that r, i, expr, and expi are floating-point numbers.
            r = +r;
            i = +i;
            expr = +expr;
            expi = +expi;

            // Declare and initialize variables to be numbers.
            var rResult = 0.0;
            var iResult = 0.0;
            var j = 0.0;
            var tr = 0.0;
            var ti = 0.0;

            // Declare and initialize variables that will be used only in the
            // event we need to compute the reciprocal.
            var abs_squared = 0.0;
            var recr = 0.0;
            var reci = 0.0;

            if (+truncateDecimal(expr) == +expr) if (expi == 0.0) {
                // Compute the result if the exponent is an integer real number.
                if (+expr < 0.0) {
                    // For n less than 0, compute the reciprocal and then raise it to the opposite power.
                    abs_squared = +(r * r + i * i);
                    recr = +r / abs_squared;
                    reci = -i / abs_squared;
                    r = recr;
                    i = reci;
                    expr = +(-expr);
                }

                rResult = r;
                iResult = i;

                for (j = 1.0; +j < +expr; j = +(j + 1.0)) {
                    tr = rResult * r - iResult * i;
                    ti = rResult * i + iResult * r;
                    rResult = tr;
                    iResult = ti;
                }

                outR = rResult;
                outI = iResult;
                return;
            }
             
            // If the exponent is not a whole number or has non-zero imaginary part, use logarithms
            // together with the exponential function to compute the power.
            // x ^ y = e ^ (ln(x) * y)

            // Compute the natural log of the base:
            compute_ln(r, i);

            // Multiply that by the exponent:
            multiply(outR, outI, expr, expi);

            // Exponentiate the result
            compute_exp(outR, outI);

            // The result is now in outR, outI.            
        } // end computePower

        function add(r0, i0, r1, i1) {
            r0 = +r0;
            i0 = +i0;
            r1 = +r1;
            i1 = +i1;

            outR = +(r0 + r1);
            outI = +(i0 + i1);
        }

        function subtract(r0, i0, r1, i1) {
            r0 = +r0;
            i0 = +i0;
            r1 = +r1;
            i1 = +i1;

            outR = +(r0 - r1);
            outI = +(i0 - i1);
        }

        function multiply(r0, i0, r1, i1) {
            r0 = +r0;
            i0 = +i0;
            r1 = +r1;
            i1 = +i1;

            outR = r0 * r1 - i0 * i1;
            outI = r0 * i1 + r1 * i0;
        }

        function divide(r0, i0, r1, i1) {
            r0 = +r0;
            i0 = +i0;
            r1 = +r1;
            i1 = +i1;

            outR = +(((r0 * r1) + (i0 * i1)) / (r1 * r1 + i1 * i1));
            outI = +(((i0 * r1 - r0 * i1)) / (r1 * r1 + i1 * i1));
        }

        function compute_real(r, i) {
            r = +r;
            i = +i;
            outR = +r;
            outI = 0.0;
        }

        function compute_imag(r, i) {
            r = +r;
            i = +i;
            outR = 0.0;
            outI = +i;
        }

        function compute_abs(r, i) {
            r = +r;
            i = +i;

            // If the number is purely real, no need to compute square roots.                        
            if (i == 0.0) {
                outR = +(+r > 0.0 ? +r : -r);
                outI = 0.0;
            } else {
                outR = +sqrt(r * r + i * i);
                outI = 0.0;
            }
        }

        // Compute the "Argument" of a complex number; the angle of the number in polar coordinates.
        function compute_arg(r, i) {
            r = +r;
            i = +i;
            if (r == 0.0 & i == 0.0) {
                // Although arg(0) is undefined, I will use 0 here to avoid errors.
                outR = 0.0;
                outI = 0.0;
            }
            else {
                // outR = +(2.0 * +atan(i / (+sqrt(r * r + i * i) + r)));
                outR = +(atan2(i, r));
                outI = 0.0;
            }
        }

        // Compute the conjugate of a complex number.
        function compute_conj(r, i) {
            r = +r;
            i = +i;
            outR = +r;
            outI = +(-i);
        }

        // Compute the sine of a number given its real and imaginary parts.
        function compute_sin(r, i) {
            r = +r;
            i = +i;
            outR = +(+sin(r) * (+exp(i) + +exp(-i)) / +2);
            outI = +(+cos(r) * (+exp(i) - +exp(-i)) / +2);
        }

        // Compute hyperbolic sine using the formula below.
        // sinh(x) = -i * sin(i * x)
        function compute_sh(r, i) {
            r = +r;
            i = +i;            
            multiply(r, i, 0.0, 1.0);
            compute_sin(outR, outI);
            multiply(outR, outI, 0.0, -1.0);
        }

        function compute_cos(r, i) {
            r = +r;
            i = +i;
            outR = +(+cos(r) * (+exp(i) + +exp(-i)) / +2);
            outI = +(-(+sin(r)) * (+exp(i) - +exp(-i)) / +2);
        }
        
        // Compute the hyperbolic cosine using the formula below.
        // cosh(x) = cos(i * x)
        function compute_ch(r, i) {
            r = +r;
            i = +i;            
            multiply(r, i, 0.0, 1.0);
            compute_cos(outR, outI);
        }

        // Compute the natural exponental for a number given its real and imaginary parts.
        function compute_exp(r, i) {
            r = +r;
            i = +i;
            var t = 0.0;
            t = +exp(+r);
            outR = +(t * +cos(i));
            outI = +(t * +sin(i));
        }

        // Compute the natural log for a number given its real and imaginary parts.
        // ln(a+bi) = ln(abs(z)) + i * arg(z)
        function compute_ln(r, i) {
            r = +r;
            i = +i;
            var realPart = 0.0,
                imagPart = 0.0;
            compute_abs(r, i);
            realPart = +ln(outR);
            compute_arg(r, i);
            imagPart = +outR;
            outR = +realPart;
            outI = +imagPart;
        }

        function get_outR() {
            return +outR;
        }
        function set_outR(r) {
            r = +r;
            outR = +r;
        }

        function get_outI() {
            return +outI;
        }
        function set_outI(i) {
            i = +i;
            outI = +i;
        }

        return {
            doComputation: doComputation,            
            get_outR: get_outR,            
            get_outI: get_outI,            
        };
    })(self, foreign, heap);

    // Return computationModule that we just defined.
    return computationModule;
}