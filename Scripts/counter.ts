// Thanks to @Wodysus for the art and original object
// Thanks to @0x40 for the original script
// Script refactor, typing, and optimization by @sparr0

import * as TTP from "@tabletop-playground/api";
import { DLListNode, GhettoCounterObject } from ".";

// TTP.world.startDebugMode();

// Appease the Typescript gods who would never allow us to re-type refObject
const refGhettoCounter = TTP.refObject as GhettoCounterObject;

// previous state is necessary to detect failed increment/decrement
refGhettoCounter._previous_state = null;

// optional references to left and right neighbors
refGhettoCounter._neighbors = [null, null];

// set the digits of this and all attached counters to a specific number
refGhettoCounter.setNumber = function (number: number) {
	let curr: GhettoCounterObject | null = this;
	// seek to the right end of the group
	while (curr._neighbors[1]) {
		curr = curr._neighbors[1];
	}

	// starting on the right, set each counter to the appropriate digit
	do {
		let digit = number % 10;
		number = Math.floor(number / 10);
		curr.setState(digit);
	} while ((curr = curr._neighbors[0]));
};

// get the number represented by this and all attached counters
refGhettoCounter.getNumber = function () {
	let curr: GhettoCounterObject | null = this;
	while (curr._neighbors[0]) {
		curr = curr._neighbors[0];
	}

	let number = 0;

	// starting on the left, accumulate digits from all counters
	do {
		number = number * 10 + curr.getState();
	} while ((curr = curr._neighbors[1]));

	return number;
};

function onStateChanged(object: GhettoCounterObject, new_state: number, old_state: number) {
	object._previous_state = old_state;
}

// keep track of the previous state when an increment or decrement is attempted
refGhettoCounter.onStateChanged.add(onStateChanged);

refGhettoCounter.increment = function () {
	this.setState(this.getState() + 1);
	return this.onIncrement();
}

refGhettoCounter.onIncrement = function() {
	let digit = this.getState();
	if (digit === 9 && this._previous_state === 9) {
		if (this._neighbors[0]?.increment()) {
			this.setState(0);
			return true;
		}
		return false;
	}
	return true;
};

refGhettoCounter.decrement = function () {
	this.setState(this.getState() - 1);
	return this.onDecrement();
}

refGhettoCounter.onDecrement = function() {
	let digit = this.getState();
	if (digit === 0 && this._previous_state === 0) {
		if (this._neighbors[0]?.decrement()) {
			this.setState(9);
			return true;
		}
		return false;
	}
	return true;
};

// Wrapper functions for other methods needed to avoid loss of `this` context with
// object passed from event callback.
function onNumberAction(
	object: GhettoCounterObject,
	player: TTP.Player,
	number: number
) {
	object.setNumber(number);
}
function onPrimaryAction(object: GhettoCounterObject) {
	object.onIncrement();
}
function onSecondaryAction(object: GhettoCounterObject) {
	object.onDecrement();
}

refGhettoCounter.makeDynamic = function () {
	this.onNumberAction.add(onNumberAction);
	this.onPrimaryAction.add(onPrimaryAction);
	this.onSecondaryAction.add(onSecondaryAction);
};

refGhettoCounter.makeStatic = function () {
	this.onNumberAction.remove(onNumberAction);
	this.onPrimaryAction.remove(onPrimaryAction);
	this.onSecondaryAction.remove(onSecondaryAction);
};

refGhettoCounter.makeDynamic();

refGhettoCounter.forgetNeighbors = function () {
	this._neighbors[0] && (this._neighbors[0]._neighbors[1] = null);
	this._neighbors[1] && (this._neighbors[1]._neighbors[0] = null);
	this._neighbors[0] = null;
	this._neighbors[1] = null;
};

function onGrab(object: GhettoCounterObject, player: TTP.Player) {
	object.forgetNeighbors();
}

refGhettoCounter.onGrab.add(onGrab);

function onDestroyed(object: GhettoCounterObject) {
	object.forgetNeighbors();
}

refGhettoCounter.onDestroyed.add(onDestroyed);

refGhettoCounter.findNeighbors = function () {
	for (let index = 0; index <= 1; index++) {
		const snapPosition = this.getSnapPoint(index).getGlobalPosition();
		const candidate = TTP.world.sphereOverlap(
			snapPosition,
			0
		)[0] as GhettoCounterObject;
		if (
			!candidate || // didn't find a neighbor
			candidate.getTemplateId() != this.getTemplateId() || // not a counter
			!candidate.getPosition().equals(snapPosition, 0.01) // not snapped
		) {
			this._neighbors[index] = null;
		} else {
			this._neighbors[index] = candidate;
			candidate._neighbors[1 - index] = this;
		}
	}
};

function onSnapped(
	object: GhettoCounterObject,
	player: TTP.Player,
	snapPoint: TTP.SnapPoint
) {
	object.findNeighbors();
}

refGhettoCounter.onSnapped.add(onSnapped);

refGhettoCounter.findNeighbors();
