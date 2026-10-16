/***
* Debug.ch
*
*/

// Listing 1.1: ASSERT Compiler Macro from DEBUG.CH
// Reworked as a #translate laterin the chapter:

#ifdef DEBUG
  #translate ASSERT(<l>, <e>) => Iif(!( <l> ), <e>, NIL)
  #translate ASSERT(<l>)      => Iif(!( <l> ), Error(), NIL)
#else
  #translate ASSERT(<l>, <e>) =>
  #translate ASSERT(<l>)      =>
#endif
