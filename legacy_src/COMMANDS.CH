/***
* Commands.ch
*
* Header file implementing frequently used commands and translates
*/

// Chapter 1 - logical/character conversions
// Convert logical to character
#define LTOC(l) Iif(l, "T", "F")

// Convert character to logical
#define CTOL(c) Iif(c $ "Tt", .T., .F.)

// Listing 1.2: Implementing a REPEAT UNTIL Loop as a UDC
#command REPEAT => DO WHILE .T.
#command UNTIL <expl> => IF (<expl>); EXIT; END; END

// Listing 1.3: Command from COMMANDS.CH Implementing Default Parameters
#command DEFAULT <p> TO <val> [,<pn> TO <valn>] ;
         => ;
         <p> = iif(<p> = NIL, <val>, <p>) ;
         [;<pn> = iif(<pn> = NIL, <valn>, <pn>)]

// Listing 2.5: Translation Directive to Create Get/Set block
#xtranslate GSB(<x>) => {|x1| Iif(x1 == NIL, <x>, <x> := x1 }

// Listing 2.6: Compiler Macro to Convert Character String into Code Block
#define COMPILE(c) &("{||" + c + "}")
