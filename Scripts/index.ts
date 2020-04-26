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
	increment: () => void;
	decrement: () => void;
	makeDynamic: () => void;
	makeStatic: () => void;

	/**
	 * Called when the the state of the object changes
	 * @param {GhettoCounterObject} object - The reference object
	 * @param {number} newState - The new state
	 * @param {number} oldState - The state the object was in before the change
	 */
	onStateChanged: TTP.MulticastDelegate<
		(
			ghettocounterObject: GhettoCounterObject,
			newState: number,
			oldState: number
		) => void
	>;

	_previous_state: null | number;
	_inc_prev: () => void;
	_dec_prev: () => void;
}
