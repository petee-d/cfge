Context-free grammar explorer
====

A syntax analysis algorithm visualization tool. Provides step-by-step visualizations of several algorithms to transform entered context-free formal grammars, to create parsing tables and to simulate parsers on any chosen input.

Hosted at:
## http://micro.dcs.fmph.uniba.sk/cfge/

#### Implemented grammar normal forms
* reduced (reachable and generating nonterminals)
* epsilon-free
* chain-rule-free (no unit productions)
* Chomsky (a weaker and stronger form)
* left recursion removal
* Greibach
* left factoring

#### Implemented parse table creation and parser simulation
* SLR(1)
* CLR(1)
* LALR(1)
* LL(1)
* CYK (not visualized)

#### Thesis
The bachelor's thesis this project is a part of can be found at:

http://micro.dcs.fmph.uniba.sk/cfge/thesis.pdf

The thesis includes:
* a usage example with pictures
* normal form definitions and short algorithm specifics
* an introduction to the project's framework for visualizing algorithms on context-free grammars
 * can aid implementing more algorithms for the project
* project backgrounds - other projects, technologies and goals
