import * as TTP from "@tabletop-playground/api";

export interface DLListNode<T> {
	obj: T;
	prev: DLListNode<T> | null;
	next: DLListNode<T> | null;
}

export interface ScriptedCounterObject extends TTP.MultistateObject {
	setNumber: (number: number) => void;
	getNumber: () => number;
	increment: () => boolean;
	onIncrement: () => boolean;
	decrement: () => boolean;
	onDecrement: () => boolean;
	makeDynamic: () => void;
	makeStatic: () => void;
	findNeighbors: () => void;
	forgetNeighbors: () => void;

	_previous_state: null | number;
	_groupends: [ScriptedCounterObject, ScriptedCounterObject];
	_neighbors: [ScriptedCounterObject | null, ScriptedCounterObject | null];
	_propagateGroupend: (index: number) => void;
	_edgeLine: (edge: number, color: TTP.Color) => void;
	_edgePoint: (edge: number, color: TTP.Color) => void;
}
