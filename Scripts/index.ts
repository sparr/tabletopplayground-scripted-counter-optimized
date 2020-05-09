import * as TTP from "@tabletop-playground/api";

export interface DLListNode<T> {
	obj: T;
	prev: DLListNode<T> | null;
	next: DLListNode<T> | null;
}

export interface GhettoCounterObject extends TTP.MultistateObject {
	getNeighborsList: () => {
		head: DLListNode<GhettoCounterObject>;
		tail: DLListNode<GhettoCounterObject>;
	};
	getNextCounter: () => GhettoCounterObject | undefined;
	getPrevCounter: () => GhettoCounterObject | undefined;
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
	_neighbors: [GhettoCounterObject | null,GhettoCounterObject | null];
	_inc_prev: () => void;
	_dec_prev: () => void;
}
