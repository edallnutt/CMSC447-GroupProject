/**
 * @class JsonAdminModel
 */
 class AdminModel {
  /**
   * @method constructor
   *
   */
  constructor(type, id) {
    this.id = id;
    this._type = type;
    this._attributes = [];
    this._relationships = [];
  }

  /**
   * init 
   */
  serialize(opts) {
    var self = this,
        res = { data: { type: this._type } },
        key;

    opts = opts || {};
    opts.attributes = opts.attributes || this._attributes;
    opts.relationships = opts.relationships || this._relationships;

    if (this.id !== undefined) res.data.id = this.id;
    if (opts.attributes.length !== 0) res.data.attributes = {};
    if (opts.relationships.length !== 0) res.data.relationships = {};

    opts.attributes.forEach(function(key) {
      res.data.attributes[key] = self[key];
    });

    opts.relationships.forEach(function(key) {
      function relationshipIdentifier(model) {
        return { type: model._type, id: model.id };
      }
      if (!self[key]) {
        res.data.relationships[key] = { data: null };
      } else if (self[key].constructor === Array) {
        res.data.relationships[key] = {
          data: self[key].map(relationshipIdentifier)
        };
      } else {
        res.data.relationships[key] = {
          data: relationshipIdentifier(self[key])
        };
      }
    });

    return res;
  }


  setAttribute(attrName, value) {
    if (this[attrName] === undefined) this._attributes.push(attrName);
    this[attrName] = value;
  }


  setRelationship(clientName, admin) {
    if (this[clientName] === undefined) this._relationships.push(clientName);
    this[clientName] = admin;
  }
}

/**
 * @class JsonAdminStore
 */
class JsonAdminStore {
  /**
   * @method constructor
   */
  constructor() {
    this.graph = {};
  }

  /**
   * Remove a model from the store.
   * @method destroy
   * @param {object} model The model to destroy.
   */
  destroy(model) {
    delete this.graph[model._type][model.id];
  }

  /**
   * Retrieve by type & ID
   */
  find(type, id) {
    if (!this.graph[type] || !this.graph[type][id]) return null;
    return this.graph[type][id];
  }

  /**
   * Retrieve all submits
   */
  findAll(type) {
    var self = this;

    if (!this.graph[type]) return [];
    return Object.keys(self.graph[type]).map(function(v) { return self.graph[type][v]; });
  }

  /**
   * Empty the store.
   */
  reset() {
    this.graph = {};
  }

  initModel(type, id) {
    this.graph[type] = this.graph[type] || {};
    this.graph[type][id] = this.graph[type][id] || new JsonAdminStoreModel(type, id);

    return this.graph[type][id];
  }

  syncRecord(rec) {
    var self = this,
        model = this.initModel(rec.type, rec.id),
        key;

    function findOrInit(resource) {
      if (!self.find(resource.type, resource.id)) {
        var placeHolderModel = self.initModel(resource.type, resource.id);
        placeHolderModel._placeHolder = true;
      }
      return self.graph[resource.type][resource.id];
    }

    delete model._placeHolder;

    for (key in rec.attributes) {
      if (model._attributes.indexOf(key) === -1) {
        model._attributes.push(key);
      }
      model[key] = rec.attributes[key];
    }

    if (rec.relationships) {
      for (key in rec.relationships) {
        var rel = rec.relationships[key];
        if (rel.data !== undefined) {
          model._relationships.push(key);
          if (rel.data === null) {
            model[key] = null;
          } else if (rel.data.constructor === Array) {
            model[key] = rel.data.map(findOrInit);
          } else {
            model[key] = findOrInit(rel.data);
          }
        }
        if (rel.links) {
          console.log("Warning: Links not implemented yet.");
        }
      }
    }

    return model;
  }

  /**
   * Sync a JSONAdming-compliant payload with the store and return
   *    any metadata included in the payload
   */
  syncWithMeta(payload) {
    var primary = payload.data,
        syncRecord = this.syncRecord.bind(this);
    if (!primary) return [];
    if (payload.included) payload.included.map(syncRecord);
    return {
      data: (primary.constructor === Array) ? primary.map(syncRecord) : syncRecord(primary),
      meta: ("meta" in payload) ? payload.meta : null
    };
  }

  sync(payload) {
    return this.syncWithMeta(payload).data;
  }
}



if ('undefined' !== typeof module) {
  module.exports = {
    JsonAdminStore: JsonAdminStore,
    JsonAdminStoreModel: JsonAdminStoreModel
  };
}
