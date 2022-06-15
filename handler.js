'use strict';

module.exports.parser = async (event) => {
  const blockingCaps = ['mentoria', 'labs', 'artigo'];

  return {
    name: event.name,
    email: event.email,
    valid: !blockingCaps.includes(event.caps),
  };
};

module.exports.approve = async (event) => {
  return {
    approved: true,
    email: event.email,
  };
};

module.exports.reject = async (event) => {
  return {
    approved: false,
    email: event.email,
  };
};

