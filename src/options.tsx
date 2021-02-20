import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";

import { OPTIONS_DEFAULTS, POP_UP_AS_TAB_EXCEPTIONS_DEFAULT, strTrim } from "./utils";

const Options = () => {
  const [status, setStatus] = useState<string>();
  const [tabOpenPos, setTabOpenPos] = useState<string>();
  const [tabCloseAction, setTabCloseAction] = useState<string>();
  const [newTabAction, setNewTabAction] = useState<string>();
  const [popUpAsTab, setPopUpAsTab] = useState<boolean>();
  const [popUpAsTabExceptions, setPopUpAsTabExceptions] = useState<string>();
  const [externalLinkDefault, setExternalLinkDefault] = useState<boolean>();
  const [externalLinkUnfocus, setExternalLinkUnfocus] = useState<boolean>();

  const TAB_OPEN_POS_OPTIONS = [
    "first",
    "last",
    "right",
    "left",
    "default",
  ];
  const TAB_CLOSE_ACTION_OPTIONS = [
    "first",
    "last",
    "right",
    "left",
    "order",
    "default",
  ];
  const NEW_TAB_ACTION_OPTIONS = [
    "foreground",
    "background",
    "default",
  ];


  useEffect(() => {
    // Restores state using the preferences
    // stored in chrome.storage.
    chrome.storage.sync.get(
      OPTIONS_DEFAULTS,
      (items) => {
        setTabOpenPos(items.tabOpenPos);
        setTabCloseAction(items.tabCloseAction);
        setNewTabAction(items.newTabAction);
        setPopUpAsTab(items.popUpAsTab);
        setPopUpAsTabExceptions(items.popUpAsTabExceptions);
        setExternalLinkDefault(items.defaultForExternalLinks);
        setExternalLinkUnfocus(items.externalLinkUnfocus);
      }
    );
  }, []);

  const saveOptions = () => {
    // Saves options to chrome.storage.sync.
    let options = {
      tabOpenPos,
      tabCloseAction,
      newTabAction,
      popUpAsTab,
      popUpAsTabExceptions,
      externalLinkDefault,
      externalLinkUnfocus,
    };
    chrome.storage.sync.set(
      options,
      () => {
        // Update status to let user know options were saved.
        setStatus("Options saved.");
        const id = setTimeout(() => {
          setStatus("");
        }, 2000);
        return () => clearTimeout(id);
      }
    );
  };

  const handleExceptionsReset = (event: React.MouseEvent) => {
    setPopUpAsTabExceptions(POP_UP_AS_TAB_EXCEPTIONS_DEFAULT);
    event.preventDefault();
  }

  const handleExceptionsChange = (value: string) => {
    let exceptions = value.split('\n');

    let cleaned = [];
    for (let exception of exceptions) {
      exception = strTrim(exception);
      if (exception.length != 0) {
        cleaned.push(exception);
      }
    }
    setPopUpAsTabExceptions(cleaned.join("\n"));
  }

  const getOptionHeader = (optionId: string): JSX.Element => {
    return (
      <div className="option-header">{chrome.i18n.getMessage(optionId)}</div>
    )
  }

  return (
    <>
      <h1>{chrome.i18n.getMessage("optionsTitle")}</h1>

      <div>
        {getOptionHeader("open")}
        <select
          value={tabOpenPos}
          onChange={(event) => setTabOpenPos(event.target.value)}>
          {TAB_OPEN_POS_OPTIONS.map((option) =>
            <option key={option} value={option}>{chrome.i18n.getMessage("open_" + option)}</option>
          )}
        </select>
      </div>

      <div>
        {getOptionHeader("close")}
        <select
          value={tabCloseAction}
          onChange={(event) => setTabCloseAction(event.target.value)}>
          {TAB_CLOSE_ACTION_OPTIONS.map((option) =>
            <option key={option} value={option}>{chrome.i18n.getMessage("close_" + option)}</option>
          )}
        </select>
      </div>

      <div>
        {getOptionHeader("new")}
        <select
          value={newTabAction}
          onChange={(event) => setNewTabAction(event.target.value)}>
          {NEW_TAB_ACTION_OPTIONS.map((option) =>
            <option key={option} value={option}>{chrome.i18n.getMessage("new_" + option)}</option>
          )}
        </select>
      </div>

      <div>
        {getOptionHeader("popUpOptions")}
        <label>
          <input
            type="checkbox"
            checked={popUpAsTab}
            onChange={(event) => setPopUpAsTab(event.target.checked)}
          />
          {" " + chrome.i18n.getMessage("popUpSameWindow")}
        </label>
        <div>{chrome.i18n.getMessage("popUpSameWindowException")}</div>
        <textarea
          name="exception"
          cols={50}
          rows={5}
          wrap="hard"
          value={popUpAsTabExceptions}
          disabled={!popUpAsTab}
          onChange={(event) => handleExceptionsChange(event.target.value)}/>
        <button onClick={handleExceptionsReset} disabled={!popUpAsTab}>{chrome.i18n.getMessage("reset")}</button>
      </div>
      <p>
        <button onClick={saveOptions}>{chrome.i18n.getMessage("save")}</button>
      </p>
      <p className="status">{status!}</p>
    </>
  );
};

ReactDOM.render(
  <React.StrictMode>
    <Options/>
  </React.StrictMode>,
  document.getElementById("root")
);
