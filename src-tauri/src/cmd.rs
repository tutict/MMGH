use serde::Deserialize;

#[derive(Deserialize)]
#[serde(tag = "cmd", rename_all = "camelCase")]
pub enum Cmd {
  // your custom commands
  // multiple arguments are allowed
  // note that rename_all = "camelCase": you need to use "myCustomCommand" on JS
  MyCustomCommand { argument: String },
  ListNotes {
    query: Option<String>,
    limit: Option<u32>,
    callback: String,
    error: String,
  },
  AddNote {
    title: Option<String>,
    content: String,
    mood: Option<String>,
    tags: Option<Vec<String>>,
    callback: String,
    error: String,
  },
  UpdateNote {
    id: i64,
    title: Option<String>,
    content: String,
    mood: Option<String>,
    tags: Option<Vec<String>>,
    callback: String,
    error: String,
  },
  DeleteNote {
    id: i64,
    callback: String,
    error: String,
  },
}
