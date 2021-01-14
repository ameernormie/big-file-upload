function after(count, func) {
  function abc() {
    if (count === 1) {
      func();
    }
    count--;
  }

  return abc;
}

const called = function () {
  console.log("hello");
};

const afterCalled = after(5, called);
afterCalled();
afterCalled();
afterCalled();
afterCalled();
afterCalled();
