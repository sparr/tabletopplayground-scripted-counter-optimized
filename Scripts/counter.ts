// Thanks to @Wodysus for the art and original object
// Thanks to @0x40 for the original script
// Script refactor, typing, and optimization by @sparr0

import * as TTP from "@tabletop-playground/api";
import { DLListNode, GhettoCounterObject } from ".";

// TTP.world.startDebugMode();

const refGhettoCounter = TTP.refObject as GhettoCounterObject;

// previous state is necessary to detect failed increment/decrement
refGhettoCounter._previous_state = null;

refGhettoCounter.getNeighborsList = function () {
	// linked list of connected counters
	let head: DLListNode<GhettoCounterObject> = {
		obj: this,
		next: null,
		prev: null,
	};
	let tail = head;
	let curr = tail;
	let found;

	// find counters to the left of this one
	while ((found = curr.obj.getPrevCounter()) && found != tail.obj) {
		head = curr = curr.prev = { obj: found, next: curr, prev: null };
	}

	// find counters to the right of this one
	curr = tail;
	while ((found = curr.obj.getNextCounter()) && found != tail.obj) {
		tail = curr = curr.next = { obj: found, next: null, prev: curr };
	}

	return { head: head, tail: tail };
};

// set the digits of this and all attached counters
refGhettoCounter.setNumber = function (number: number) {
	let curr: DLListNode<GhettoCounterObject> | null = this.getNeighborsList()
		.tail;

	// starting on the right, set each counter to the appropriate digit
	do {
		let digit = number % 10;
		number = Math.floor(number / 10);
		curr.obj.setState(digit);
	} while ((curr = curr.prev));
};

// get the number represented by this and all attached counters
refGhettoCounter.getNumber = function () {
	let curr: DLListNode<GhettoCounterObject> | null = this.getNeighborsList()
		.head;
	let number = 0;

	// starting on the left, set each counter to the appropriate digit
	do {
		number = number * 10 + curr.obj.getState();
	} while ((curr = curr.next));

	return number;
};

// find the counter to the "right" of this one
refGhettoCounter.getNextCounter = function () {
	//FIXME: use getSnappedObject when implemented in TP
	const candidate = TTP.world.sphereOverlap(
		this.getSnapPoint(1).getGlobalPosition(),
		0
	)[0] as GhettoCounterObject;
	if (candidate?.getTemplateId() == this.getTemplateId()) {
		return candidate;
	}
};

// find the counter to the "left" of this one
refGhettoCounter.getPrevCounter = function () {
	//FIXME: use getSnappedObject when implemented in TP
	const candidate = TTP.world.sphereOverlap(
		this.getSnapPoint(0).getGlobalPosition(),
		0
	)[0] as GhettoCounterObject;
	if (candidate?.getTemplateId() == this.getTemplateId()) {
		return candidate;
	}
};

// keep track of the previous state when an increment or decrement is attempted
refGhettoCounter.onStateChanged.add(function (obj, new_state, old_state) {
	obj._previous_state = old_state;
});

// recursively increment the previous counter with rollover
refGhettoCounter._inc_prev = function () {
	let prev = this.getPrevCounter();
	if (prev) {
		let digit = prev.getState();
		if (digit === 9) {
			prev.setState(0);
			prev._inc_prev();
		} else {
			prev.setState(digit + 1);
		}
	}
};

// recursively decrement the previous counter with rollover
refGhettoCounter._dec_prev = function () {
	let prev = this.getPrevCounter();
	if (prev) {
		let digit = prev.getState();
		if (digit === 0) {
			prev.setState(9);
			prev._dec_prev();
		} else {
			prev.setState(digit - 1);
		}
	}
};

// increment an individual counter and potentially carry to the previous counter
refGhettoCounter.increment = function () {
	let digit = this.getState();
	if (digit === 9 && this._previous_state === 9) {
		this.setState(0);
		this._inc_prev();
	}
};

// increment an individual counter and potentially borrow from the previous counter
refGhettoCounter.decrement = function () {
	let digit = this.getState();
	if (digit === 0 && this._previous_state === 0) {
		this.setState(9);
		this._dec_prev();
	}
};

// Wrapper functions for other methods needed to avoid loss of `this` context with
// object passed from event callback.
// object type enforced by .add() methods, TODO fix this when API is fixed
function onNumberAction(
	object: TTP.GameObject,
	player: TTP.Player,
	number: number
) {
	(object as GhettoCounterObject).setNumber(number);
}
function onPrimaryAction(object: TTP.GameObject) {
	(object as GhettoCounterObject).increment;
}
function onSecondaryAction(object: TTP.GameObject) {
	(object as GhettoCounterObject).decrement;
}

refGhettoCounter.makeDynamic = function () {
	this.onNumberAction.add(onNumberAction);
	this.onPrimaryAction.add(onPrimaryAction);
	this.onSecondaryAction.add(onSecondaryAction);
};

refGhettoCounter.makeDynamic();

refGhettoCounter.makeStatic = function () {
	this.onNumberAction.remove(onNumberAction);
	this.onPrimaryAction.remove(onPrimaryAction);
	this.onSecondaryAction.remove(onSecondaryAction);
};
